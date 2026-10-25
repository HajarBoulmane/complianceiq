import { Router } from "express";
import {
  register, login, logout, getMe,
  googleAuthHandler, verifyEmailHandler, resendCodeHandler,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authLimiter, codeLimiter } from "../middleware/rateLimit.middleware";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/google", authLimiter, googleAuthHandler);
router.post("/verify-email", codeLimiter, verifyEmailHandler);
router.post("/resend-code", codeLimiter, resendCodeHandler);
router.post("/logout", logout);
router.get("/me", authenticate, getMe);

export default router;