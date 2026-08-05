import { Request, Response } from "express";
import {
  askAndSave,
  analyzeAndSave,
  getConversations,
  getConversationMessages,
  deleteConversation as deleteConversationService,
  getDocuments,
  getDocumentAnalysis,
  getDashboardStats,
  getUpcomingObligations,
  getNotifications,
  markNotificationRead,
} from "../services/compliance.service";

// En dev, on garde les détails dans les logs serveur uniquement.
// En prod, l'utilisateur ne reçoit jamais err.message (stack trace, requête SQL, etc).
function handleServerError(res: Response, route: string, err: any) {
  console.error(`Erreur ${route}:`, err);
  return res.status(500).json({ error: "Erreur interne du serveur" });
}

export async function askQuestion(req: Request, res: Response) {
  try {
    const { question, topK, conversationId } = req.body;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ error: "Non authentifié" });
    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "Le champ 'question' est requis (string)" });
    }

    const result = await askAndSave(userId, question, conversationId, topK);
    return res.status(200).json(result);
  } catch (err: any) {
    return handleServerError(res, "/compliance/ask", err);
  }
}

export async function analyzeContract(req: Request, res: Response) {
  try {
    const { contractText, filename } = req.body;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ error: "Non authentifié" });
    if (!contractText) return res.status(400).json({ error: "contractText requis" });

    const result = await analyzeAndSave(userId, contractText, filename);
    return res.status(200).json(result);
  } catch (err: any) {
    return handleServerError(res, "/compliance/analyze-contract", err);
  }
}

export async function listConversations(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });
    const conversations = await getConversations(userId);
    return res.status(200).json({ conversations });
  } catch (err: any) {
    return handleServerError(res, "/compliance/conversations", err);
  }
}

export async function getConversation(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const conversationId = parseInt(idParam, 10);
    const conversation = await getConversationMessages(userId, conversationId);
    return res.status(200).json({ conversation });
  } catch (err: any) {
    console.error("Erreur /compliance/conversations/:id:", err);
    return res.status(404).json({ error: "Conversation introuvable" });
  }
}

export async function deleteConversation(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const conversationId = parseInt(idParam, 10);
    await deleteConversationService(userId, conversationId);
    return res.status(204).send();
  } catch (err: any) {
    console.error("Erreur DELETE /compliance/conversations/:id:", err);
    return res.status(404).json({ error: "Conversation introuvable" });
  }
}

export async function listDocuments(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });
    const documents = await getDocuments(userId);
    return res.status(200).json({ documents });
  } catch (err: any) {
    return handleServerError(res, "/compliance/documents", err);
  }
}

export async function getDocument(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });
    const docIdParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const documentId = parseInt(docIdParam, 10);
    const document = await getDocumentAnalysis(userId, documentId);
    return res.status(200).json({ document });
  } catch (err: any) {
    console.error("Erreur /compliance/documents/:id:", err);
    return res.status(404).json({ error: "Document introuvable" });
  }
}

export async function getStats(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });
    const stats = await getDashboardStats(userId);
    return res.status(200).json(stats);
  } catch (err: any) {
    return handleServerError(res, "/compliance/stats", err);
  }
}

export async function listObligations(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });

    const withinDaysRaw = req.query.withinDays;
    const withinDays = withinDaysRaw ? parseInt(withinDaysRaw as string, 10) : 30;

    const obligations = await getUpcomingObligations(
      userId,
      isNaN(withinDays) ? 30 : withinDays
    );
    return res.status(200).json({ obligations });
  } catch (err: any) {
    return handleServerError(res, "/compliance/obligations", err);
  }
}

export async function listNotifications(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });

    const unreadOnly = req.query.unreadOnly === "true";
    const notifications = await getNotifications(userId, unreadOnly);
    return res.status(200).json({ notifications });
  } catch (err: any) {
    return handleServerError(res, "/compliance/notifications", err);
  }
}

export async function markNotificationAsRead(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });

    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const notificationId = parseInt(idParam, 10);
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: "id invalide" });
    }

    const notification = await markNotificationRead(userId, notificationId);
    return res.status(200).json({ notification });
  } catch (err: any) {
    console.error("Erreur PATCH /compliance/notifications/:id/read:", err);
    return res.status(404).json({ error: "Notification introuvable" });
  }
}