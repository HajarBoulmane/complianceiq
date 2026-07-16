import { RetrievedChunk } from "../retrieval/retriever";

export function buildRagPrompt(query: string, chunks: RetrievedChunk[]): string {
  const context = chunks
    .map((c, i) => `[Source ${i + 1} — ${c.sourceFile}]\n${c.text}`)
    .join("\n\n");

  return `Tu es un assistant spécialisé en conformité réglementaire pour les PME marocaines (protection des données, droit du travail, RGPD).

Utilise UNIQUEMENT le contexte ci-dessous pour répondre à la question. Si le contexte ne contient pas assez d'information, dis-le clairement au lieu d'inventer une réponse.

CONTEXTE :
${context}

QUESTION :
${query}

RÉPONSE (cite les sources utilisées, ex: "selon Source 1") :`;
}