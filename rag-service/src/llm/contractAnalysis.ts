import { askLLM } from "./llmClient";

export async function analyzeContract(contractText: string): Promise<string> {
  const prompt = `Tu es un expert en conformité juridique pour les PME marocaines (droit du travail, protection des données Loi 09-08, RGPD).

Analyse le contrat suivant et identifie :
1. Les clauses manquantes ou incomplètes
2. Les déséquilibres de responsabilité entre les parties (asymétrie de responsabilité)
3. Les risques de non-conformité à la Loi 09-08 ou au RGPD si le contrat traite des données personnelles
4. Toute clause potentiellement abusive ou risquée pour l'une des parties

CONTRAT :
${contractText}

Réponds de manière structurée avec des sections claires (Clauses manquantes / Déséquilibres / Risques réglementaires / Recommandations).`;

  return askLLM(prompt);
}