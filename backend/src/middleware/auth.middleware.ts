import { Request, Response, NextFunction } from "express";
import prisma from "../prisma";
import { clearAuthCookie } from "../utils/cookies";
import { verifyToken } from "../utils/jwt";

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  let decoded: { userId: number; role: string };
  try {
    decoded = verifyToken(token) as { userId: number; role: string };
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { isVerified: true, passwordHash: true },
    });

    if (!user) {
      clearAuthCookie(res);
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    if (!user.isVerified) {
      clearAuthCookie(res);
      res.status(403).json({
        error: "Email not verified",
        code: "EMAIL_NOT_VERIFIED",
      });
      return;
    }

    if (!user.passwordHash) {
      clearAuthCookie(res);
      res.status(403).json({
        error: "Account must be registered before signing in",
        code: "EMAIL_NOT_REGISTERED",
      });
      return;
    }

    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch (error) {
    console.error("Authentication failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
