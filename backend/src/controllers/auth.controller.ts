import { Request, Response } from "express";
import { z } from "zod";
import {
  registerUser, loginUser, loginWithGoogle,
  verifyUserCode, resendVerificationCode,
} from "../services/auth.service";
import { setAuthCookie, clearAuthCookie } from "../utils/cookies";
import prisma from "../prisma";

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(72),
  fullName: z.string().trim().max(100).optional(),
});
const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(72) });
const verifySchema = z.object({ email: emailSchema, code: z.string().regex(/^\d{6}$/) });
const resendSchema = z.object({ email: emailSchema });
const googleSchema = z.object({ idToken: z.string().min(1) });

const publicUser = (u: { id: number; email: string; role: string }) => ({
  id: u.id, email: u.email, role: u.role,
});

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : undefined;

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid data" });
  try {
    const { email, password, fullName } = parsed.data;
    await registerUser(email, password, fullName);
    return res.status(201).json({ message: "Verification code sent", email });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message === "VERIFICATION_EMAIL_FAILED") {
      return res.status(503).json({
        error: "Account created, but the verification email could not be sent",
        code: "VERIFICATION_EMAIL_FAILED",
      });
    }
    if (message === "EMAIL_ALREADY_EXISTS") {
      return res.status(409).json({ error: "Email already in use" });
    }
    console.error("Registration failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid data" });
  try {
    const { user, token } = await loginUser(parsed.data.email, parsed.data.password);
    setAuthCookie(res, token);
    return res.status(200).json({ user: publicUser(user) });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message === "EMAIL_NOT_VERIFIED") {
      return res.status(403).json({ error: "Email not verified", code: "EMAIL_NOT_VERIFIED" });
    }
    if (message === "GOOGLE_ACCOUNT_USE_OAUTH") {
      return res.status(400).json({ error: "Use Google sign-in for this account" });
    }
    if (message === "INVALID_CREDENTIALS") {
      console.warn("[security] login_failed", { ip: req.ip });
      return res.status(401).json({ error: "Invalid email or password" });
    }
    console.error("Login failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function verifyEmailHandler(req: Request, res: Response) {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid or expired code" });
  try {
    const { user, token } = await verifyUserCode(parsed.data.email, parsed.data.code);
    setAuthCookie(res, token);
    return res.json({ user: publicUser(user) });
  } catch (error: unknown) {
    if (getErrorMessage(error) !== "INVALID_OR_EXPIRED_CODE") {
      console.error("Email verification failed:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
    console.warn("[security] verify_code_failed", { ip: req.ip });
    return res.status(400).json({ error: "Invalid or expired code" });
  }
}

export async function resendCodeHandler(req: Request, res: Response) {
  const parsed = resendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid data" });
  try {
    await resendVerificationCode(parsed.data.email);
  } catch (err) {
    if (getErrorMessage(err) === "VERIFICATION_EMAIL_FAILED") {
      return res.status(503).json({
        error: "Verification email could not be sent",
        code: "VERIFICATION_EMAIL_FAILED",
      });
    }
    console.error("resend failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
  return res.json({ message: "If the account exists, a code was sent" });
}

export async function googleAuthHandler(req: Request, res: Response) {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid data" });
  try {
    const { user, token } = await loginWithGoogle(parsed.data.idToken);
    setAuthCookie(res, token);
    return res.json({ user: publicUser(user) });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message === "EMAIL_NOT_REGISTERED") {
      return res.status(403).json({
        error: "No account is registered with this Google email",
        code: "EMAIL_NOT_REGISTERED",
      });
    }
    if (message === "EMAIL_NOT_VERIFIED") {
      return res.status(403).json({
        error: "Email not verified",
        code: "EMAIL_NOT_VERIFIED",
      });
    }
    console.error("Google authentication failed:", error);
    return res.status(401).json({ error: "Invalid Google authentication" });
  }
}

export function logout(_req: Request, res: Response) {
  clearAuthCookie(res);
  return res.status(200).json({ message: "Logged out" });
}

export async function getMe(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, role: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.status(200).json({ user });
  } catch (error: unknown) {
    console.error("Fetching current user failed:", error);
    return res.status(500).json({ error: "Server error" });
  }
}