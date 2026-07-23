import { askLLM } from "./llmClient";

export interface ContractAnalysisResult {
  score_global: number;
  categories: {
    nom: string;
    score: number;
    nb_problemes: number;
  }[];
  clauses_manquantes: string[];
  risques: {
    clause: string;
    severite: "haute" | "moyenne" | "basse";
    description: string;
    reference_legale?: string;
  }[];
  resume: string;
}

export async function analyzeContract(contractText: string): Promise<ContractAnalysisResult> {
  const prompt = `Tu es un expert en conformité juridique pour les PME marocaines (droit du travail, protection des données Loi 09-08, RGPD).

Analyse le contrat suivant et réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après, sans balises markdown (pas de \`\`\`json), respectant EXACTEMENT ce schéma :

{
  "score_global": <nombre entre 0 et 100, représentant le niveau de conformité global>,
  "categories": [
    { "nom": "Protection des données", "score": <0-100>, "nb_problemes": <entier> },
    { "nom": "Droit du travail", "score": <0-100>, "nb_problemes": <entier> },
    { "nom": "Clauses manquantes", "score": <0-100>, "nb_problemes": <entier> },
    { "nom": "Équilibre contractuel", "score": <0-100>, "nb_problemes": <entier> }
  ],
  "clauses_manquantes": [<liste de strings, noms des clauses absentes>],
  "risques": [
    {
      "clause": "<nom ou référence de l'article concerné>",
      "severite": "haute" | "moyenne" | "basse",
      "description": "<explication concise du problème>",
      "reference_legale": "<référence légale précise si applicable, sinon omettre ce champ>"
    }
  ],
  "resume": "<résumé en 2-3 phrases de l'état général de conformité du contrat>"
}

Règles :
- score_global et les scores par catégorie doivent refléter honnêtement la gravité des problèmes trouvés (un contrat avec des violations graves de protection des données doit avoir un score bas)
- nb_problemes doit correspondre au nombre réel de risques trouvés dans cette catégorie
- Si aucun problème n'est trouvé dans une catégorie, score = 100 et nb_problemes = 0
- Chaque risque identifié doit être concret et référencé au texte du contrat, pas générique

CONTRAT :
${contractText}

Réponds uniquement avec le JSON, rien d'autre.`;

  const rawResponse = await askLLM(prompt);

  // Nettoyage au cas où le LLM ajoute des balises markdown malgré la consigne
  const cleaned = rawResponse
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `Le LLM n'a pas retourné un JSON valide. Réponse brute: ${rawResponse.slice(0, 500)}`
    );
  }
}