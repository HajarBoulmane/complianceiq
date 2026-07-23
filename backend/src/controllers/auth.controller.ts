import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/auth.service";
import prisma from "../prisma";

export async function register(req: Request, res: Response) {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const { user, token } = await registerUser(email, password, fullName);

    res.cookie("token", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 24 * 60 * 60 * 1000,
});

    return res.status(201).json({
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err: any) {
    if (err.message === "EMAIL_ALREADY_EXISTS") {
      return res.status(409).json({ error: "Email already in use" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const { user, token } = await loginUser(email, password);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err: any) {
    if (err.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export function logout(req: Request, res: Response) {
  res.clearCookie("token");
  return res.status(200).json({ message: "Logged out" });
}

export async function getMe(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}