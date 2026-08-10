import bcrypt from "bcrypt";
import prisma from "../prisma";
import { signToken } from "../utils/jwt";
import { OAuth2Client } from "google-auth-library";
import { sendVerificationEmail } from "./email.service";


const SALT_ROUNDS = 10;


function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function registerUser(email: string, password: string, fullName?: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("EMAIL_ALREADY_EXISTS");

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const verificationCode = generateCode();
  const verificationCodeExpiry = new Date(Date.now() + 10 * 60 * 1000);

  const user = await prisma.user.create({
    data: { email, passwordHash, fullName, verificationCode, verificationCodeExpiry },
  });

  // ✅ Don't let email failure crash the registration
  try {
    await sendVerificationEmail(email, verificationCode);
  } catch (err) {
    console.error("Failed to send verification email:", err);
    // Optionally: queue for retry, or log to a job table
  }

  const token = signToken({ userId: user.id, role: user.role });
  return { user, token };
}



export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("INVALID_CREDENTIALS");

  if (!user.passwordHash) throw new Error("GOOGLE_ACCOUNT_USE_OAUTH");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error("INVALID_CREDENTIALS");

  if (!user.isVerified) throw new Error("EMAIL_NOT_VERIFIED");

  const token = signToken({ userId: user.id, role: user.role });
  return { user, token };
}


const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function verifyUserCode(email: string, code: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("INVALID_CREDENTIALS");
  if (user.isVerified) throw new Error("ALREADY_VERIFIED");

  if (
    !user.verificationCode ||
    user.verificationCode !== code ||
    !user.verificationCodeExpiry ||
    user.verificationCodeExpiry < new Date()
  ) {
    throw new Error("INVALID_OR_EXPIRED_CODE");
  }

  await prisma.user.update({
    where: { email },
    data: { isVerified: true, verificationCode: null, verificationCodeExpiry: null },
  });

  return { success: true };
}

export async function loginWithGoogle(idToken: string) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.email) throw new Error("INVALID_GOOGLE_TOKEN");

  let user = await prisma.user.findUnique({ where: { email: payload.email } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: payload.email,
        fullName: payload.name,
        googleId: payload.sub,
        isVerified: true,
      },
    });
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: { email: payload.email },
      data: { googleId: payload.sub },
    });
  }

  const token = signToken({ userId: user.id, role: user.role });
  return { user, token };
}