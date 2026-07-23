import { Request, Response } from "express";
import {
  askAndSave,
  analyzeAndSave,
  getConversations,
  getConversationMessages,
  getDocuments,
  getDocumentAnalysis,
  getDashboardStats,
} from "../services/compliance.service";

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
    console.error("Erreur /compliance/ask:", err);
    return res.status(500).json({ error: "Erreur interne du serveur", details: err.message });
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
    console.error("Erreur /compliance/analyze-contract:", err);
    return res.status(500).json({ error: "Erreur interne", details: err.message });
  }
}

export async function listConversations(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });
    const conversations = await getConversations(userId);
    return res.status(200).json({ conversations });
  } catch (err: any) {
    return res.status(500).json({ error: "Erreur interne", details: err.message });
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
    return res.status(404).json({ error: err.message });
  }
}

export async function listDocuments(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });
    const documents = await getDocuments(userId);
    return res.status(200).json({ documents });
  } catch (err: any) {
    return res.status(500).json({ error: "Erreur interne", details: err.message });
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
    return res.status(404).json({ error: err.message });
  }
}

export async function getStats(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });
    const stats = await getDashboardStats(userId);
    return res.status(200).json(stats);
  } catch (err: any) {
    console.error("Erreur /compliance/stats:", err);
    return res.status(500).json({ error: "Erreur interne", details: err.message });
  }
}