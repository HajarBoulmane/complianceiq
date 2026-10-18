import { Response } from "express";

const base = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // HTTPS obligatoire en prod
  sameSite: "lax" as const,
  path: "/",
};

export const setAuthCookie = (res: Response, token: string) =>
  res.cookie("token", token, { ...base, maxAge: 24 * 60 * 60 * 1000 });

export const clearAuthCookie = (res: Response) =>
  res.clearCookie("token", base);