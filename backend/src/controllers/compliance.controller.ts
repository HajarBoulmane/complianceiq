import { Request, Response } from "express";
import { askComplianceQuestion } from "../services/compliance.service";
import { analyzeContractText } from "../services/compliance.service";

export async function askQuestion(req: Request, res: Response) {
  try {
    const { question, topK } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "Le champ 'question' est requis (string)" });
    }

    const result = await askComplianceQuestion(question, topK);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("Erreur /compliance/ask:", err);
    return res.status(500).json({ error: "Erreur interne du serveur", details: err.message });
  }
}

export async function analyzeContract(req: Request, res: Response) {
  try {
    const { contractText } = req.body;
    if (!contractText) return res.status(400).json({ error: "contractText requis" });

    const result = await analyzeContractText(contractText);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: "Erreur interne", details: err.message });
  }
}