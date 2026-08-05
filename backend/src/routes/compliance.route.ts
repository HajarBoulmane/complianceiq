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
  listObligations,
  listNotifications,
  markNotificationAsRead,
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
router.get("/obligations", authenticate, listObligations);
router.get("/notifications", authenticate, listNotifications);
router.patch("/notifications/:id/read", authenticate, markNotificationAsRead);

export default router;