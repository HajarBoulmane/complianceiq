import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  askQuestion,
  analyzeContract,
  listConversations,
  getConversation,
  listDocuments,
  getDocument,
  getStats,
} from "../controllers/compliance.controller";

const router = Router();

router.post("/ask", authenticate, askQuestion);
router.post("/analyze-contract", authenticate, analyzeContract);
router.get("/conversations", authenticate, listConversations);
router.get("/conversations/:id", authenticate, getConversation);
router.get("/documents", authenticate, listDocuments);
router.get("/documents/:id", authenticate, getDocument);
router.get("/stats", authenticate, getStats);

export default router;