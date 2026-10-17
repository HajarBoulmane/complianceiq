import bcrypt from "bcrypt";
import { randomInt } from "crypto";
import { OAuth2Client } from "google-auth-library";
import prisma from "../prisma";
import { signToken } from "../utils/jwt";
import { sendVerificationEmail } from "./email.service";

const SALT_ROUNDS = 10;
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const generateCode = () => randomInt(100000, 1000000).toString();

async function sendCodeSafely(email: string, code: string) {
  try {
    await sendVerificationEmail(email, code);
  } catch (err) {
    console.error("Failed to send verification email:", err);
  }
}

export async function registerUser(rawEmail: string, password: string, fullName?: string) {
  const email = normalizeEmail(rawEmail);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("EMAIL_ALREADY_EXISTS");

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const verificationCode = generateCode();
  const verificationCodeExpiry = new Date(Date.now() + CODE_TTL_MS);

  const user = await prisma.user.create({
    data: { email, passwordHash, fullName, verificationCode, verificationCodeExpiry },
  });

  await sendCodeSafely(email, verificationCode);
  return { user }; // pas de token : il est émis après vérification
}

export async function loginUser(rawEmail: string, password: string) {
  const email = normalizeEmail(rawEmail);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("INVALID_CREDENTIALS");
  if (!user.passwordHash) throw new Error("GOOGLE_ACCOUNT_USE_OAUTH");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error("INVALID_CREDENTIALS");
  if (!user.isVerified) throw new Error("EMAIL_NOT_VERIFIED");

  const token = signToken({ userId: user.id, role: user.role });
  return { user, token };
}

export async function verifyUserCode(rawEmail: string, code: string) {
  const email = normalizeEmail(rawEmail);

  // 1) On "consomme" un essai de façon ATOMIQUE (un seul UPDATE SQL),
  //    AVANT de comparer le code. Même avec 100 requêtes parallèles,
  //    seules 5 passent cette étape.
  const claimed = await prisma.user.updateMany({
    where: {
      email,
      isVerified: false,
      verificationCode: { not: null },
      verificationCodeExpiry: { gt: new Date() },
      verificationAttempts: { lt: MAX_ATTEMPTS },
    },
    data: { verificationAttempts: { increment: 1 } },
  });
  if (claimed.count === 0) throw new Error("INVALID_OR_EXPIRED_CODE");

  // 2) Ensuite seulement, on compare
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.verificationCode !== code) {
    throw new Error("INVALID_OR_EXPIRED_CODE");
  }

  const verified = await prisma.user.update({
    where: { email },
    data: {
      isVerified: true,
      verificationCode: null,
      verificationCodeExpiry: null,
      verificationAttempts: 0,
    },
  });

  const token = signToken({ userId: verified.id, role: verified.role });
  return { user: verified, token };
}

export async function resendVerificationCode(rawEmail: string) {
  const email = normalizeEmail(rawEmail);
  const user = await prisma.user.findUnique({ where: { email } });
  // Silencieux : on ne révèle jamais si le compte existe
  if (!user || user.isVerified || !user.passwordHash) return;

  const code = generateCode();
  await prisma.user.update({
    where: { email },
    data: {
      verificationCode: code,
      verificationCodeExpiry: new Date(Date.now() + CODE_TTL_MS),
      verificationAttempts: 0,
    },
  });
  await sendCodeSafely(email, code);
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function loginWithGoogle(idToken: string) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.email_verified) {
    throw new Error("INVALID_GOOGLE_TOKEN");
  }
  const email = normalizeEmail(payload.email);

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.user.create({
      data: { email, fullName: payload.name, googleId: payload.sub, isVerified: true },
    });
  } else if (!user.googleId) {
    // Lier un compte existant. S'il n'était pas vérifié, le mot de passe
    // a pu être posé par un tiers : on le supprime.
    user = await prisma.user.update({
      where: { email },
      data: {
        googleId: payload.sub,
        isVerified: true,
        verificationCode: null,
        verificationCodeExpiry: null,
        verificationAttempts: 0,
        ...(user.isVerified ? {} : { passwordHash: null }),
      },
    });
  } else if (user.googleId !== payload.sub) {
    throw new Error("INVALID_GOOGLE_TOKEN");
  }

  const token = signToken({ userId: user.id, role: user.role });
  return { user, token };
}