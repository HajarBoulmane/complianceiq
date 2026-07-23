import { RetrievedChunk } from "../retrieval/retriever";

export function buildRagPrompt(
  query: string,
  chunks: RetrievedChunk[],
  history?: { role: "user" | "assistant"; content: string }[]
): string {
  const context = chunks
    .map((c, i) => `[Source ${i + 1} — ${c.sourceFile}]\n${c.text}`)
    .join("\n\n");

  const conversationHistory = history?.length
    ? `HISTORIQUE DE LA CONVERSATION :\n${history
        .map((m) => `${m.role === "user" ? "Utilisateur" : "Assistant"}: ${m.content}`)
        .join("\n")}\n\n`
    : "";

  return `Tu es un assistant spécialisé en conformité réglementaire pour les PME marocaines (protection des données, droit du travail, RGPD).

Utilise UNIQUEMENT le contexte ci-dessous pour répondre à la question. Si le contexte ne contient pas assez d'information, dis-le clairement au lieu d'inventer une réponse.

${conversationHistory}CONTEXTE :
${context}

QUESTION ACTUELLE :
${query}

Réponds de manière claire et concise (3-5 phrases sauf si la question nécessite plus de détail). Cite les sources utilisées sous la forme "(Source 1)" à la fin des phrases concernées, pas au début.`;
}