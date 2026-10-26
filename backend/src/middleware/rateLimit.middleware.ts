import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import { rateLimitHitTotal } from "../metrics";

const logAndBlock =
  (limiter: string, message: { error: string }) =>
  (req: Request, res: Response, _next: unknown, options: { statusCode: number }) => {
    rateLimitHitTotal.inc({ limiter });
    console.warn("[security] rate_limit_hit", { limiter, path: req.path, ip: req.ip });
    res.status(options.statusCode).json(message);
  };

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Trop de requêtes, réessayez plus tard." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Trop d'analyses effectuées, réessayez dans quelques minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const tooManyAttempts = { error: "Trop de tentatives, réessayez plus tard" };

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyAttempts,
  handler: logAndBlock("auth", tooManyAttempts),
});

export const codeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyAttempts,
  handler: logAndBlock("code", tooManyAttempts),
});