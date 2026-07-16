import { Router } from "express";
import { analyzeContract, askQuestion } from "../controllers/compliance.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/ask", authenticate, askQuestion);
router.post("/analyze-contract", authenticate, analyzeContract);

export default router;