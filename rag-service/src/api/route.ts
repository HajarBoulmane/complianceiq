import { Router, Request, Response } from "express";
import { retrieveRelevantChunks } from "../retrieval/retriever";
import { buildRagPrompt } from "../prompts/promptTemplate";
import { askLLM } from "../llm/llmClient";
import { analyzeContract } from "../llm/contractAnalysis";


const router = Router();

router.post("/query", async (req: Request, res: Response) => {
  try {
    const { question, topK } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "Le champ 'question' est requis (string)" });
    }

    const chunks = await retrieveRelevantChunks(question, topK || 5);
    const prompt = buildRagPrompt(question, chunks);
    const answer = await askLLM(prompt);

    return res.status(200).json({
      question,
      answer,
      sources: chunks.map((c) => ({
        sourceFile: c.sourceFile,
        chunkIndex: c.chunkIndex,
        distance: c.distance,
      })),
    });
  } catch (err: any) {
    console.error("Erreur /query:", err);
    return res.status(500).json({ error: "Erreur interne du serveur", details: err.message });
  }
});


router.post("/analyze-contract", async (req: Request, res: Response) => {
  try {
    const { contractText } = req.body;

    if (!contractText || typeof contractText !== "string") {
      return res.status(400).json({ error: "Le champ 'contractText' est requis (string)" });
    }

    const analysis = await analyzeContract(contractText);
    return res.status(200).json({ analysis });
  } catch (err: any) {
    console.error("Erreur /analyze-contract:", err);
    return res.status(500).json({ error: "Erreur interne du serveur", details: err.message });
  }
});

export default router;