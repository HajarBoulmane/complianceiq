import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { generalLimiter, analyzeLimiter } from "../middleware/rateLimit.middleware";
import {
  askQuestion,
  analyzeContract,
  listConversations,
  getConversation,
  listDocuments,
  getDocument,
  getStats,
  deleteConversation,
} from "../controllers/compliance.controller";

const router = Router();

router.use(generalLimiter);

router.post("/ask", authenticate, analyzeLimiter, askQuestion);
router.post("/analyze-contract", authenticate, analyzeLimiter, analyzeContract);
router.get("/conversations", authenticate, listConversations);
router.get("/conversations/:id", authenticate, getConversation);
router.get("/documents", authenticate, listDocuments);
router.get("/documents/:id", authenticate, getDocument);
router.get("/stats", authenticate, getStats);
router.delete("/conversations/:id", authenticate, deleteConversation);

export default router;