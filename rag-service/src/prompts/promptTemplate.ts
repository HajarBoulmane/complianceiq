import { RetrievedChunk } from "../retrieval/retriever";

export function buildRagPrompt(
  query: string,
  chunks: RetrievedChunk[],
  history?: { role: "user" | "assistant"; content: string }[]
): string {
  const context = chunks
    .map((c) => c.text)
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

Réponds de manière claire, professionnelle et concise (3-5 phrases sauf si la question nécessite plus de détail), en phrases fluides. Utilise les extraits uniquement pour formuler ta réponse : ne mentionne jamais de source, de document, de nom de fichier ou de numéro d'extrait. N'ajoute aucune citation entre parenthèses ou entre crochets, aucune bibliographie et aucune section de sources. Tu peux nommer une loi ou un règlement (par exemple le RGPD ou la loi 09-08) si cela est utile à la réponse.`;
}