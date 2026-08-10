import { Router } from "express";
import { register, login, logout, getMe, googleAuthHandler, verifyEmailHandler } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authenticate, getMe);
router.post("/verify-email", verifyEmailHandler);
router.post("/google", googleAuthHandler);

export default router;