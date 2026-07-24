import { askLLM } from "./llmClient";

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type ContractType =
  | "nda"
  | "cdi"
  | "cdd"
  | "prestation_service"
  | "bail"
  | "autre";

export interface ContractAnalysisResult {
  type_contrat: ContractType;
  type_contrat_label: string;
  score_global: number;
  categories: {
    nom: string;
    cle: string; // clé stable pour le frontend (liability, termination, etc.)
    score: number;
    nb_problemes: number;
  }[];
  clauses_manquantes: string[];
  risques: {
    clause: string;
    severite: Severity;
    categorie: string; // à quelle dimension ce risque appartient
    description: string;
    reference_legale?: string;
  }[];
  resume: string;
}

export async function analyzeContract(contractText: string): Promise<ContractAnalysisResult> {
  const prompt = `Tu es un expert en conformité juridique pour les PME marocaines (droit du travail, protection des données Loi 09-08, RGPD).

Étape 1 : identifie d'abord le type de ce contrat parmi EXACTEMENT ces valeurs :
- "nda" (accord de confidentialité)
- "cdi" (contrat à durée indéterminée)
- "cdd" (contrat à durée déterminée)
- "prestation_service" (contrat de prestation de service / freelance)
- "bail" (contrat de location/bail)
- "autre" (si aucun des types ci-dessus ne correspond clairement)

Étape 2 : analyse le contrat en fonction des clauses usuellement attendues pour CE type de contrat précis (ex : un NDA n'a pas les mêmes clauses obligatoires qu'un CDI ; un bail n'a pas de clause RGPD sauf si des données personnelles sont collectées).

Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après, sans balises markdown (pas de \`\`\`json), respectant EXACTEMENT ce schéma :

{
  "type_contrat": "nda" | "cdi" | "cdd" | "prestation_service" | "bail" | "autre",
  "type_contrat_label": "<nom lisible en français, ex: 'Accord de confidentialité (NDA)'>",
  "score_global": <nombre entre 0 et 100>,
  "categories": [
    { "nom": "Responsabilité", "cle": "liability", "score": <0-100>, "nb_problemes": <entier> },
    { "nom": "Résiliation", "cle": "termination", "score": <0-100>, "nb_problemes": <entier> },
    { "nom": "Propriété intellectuelle & Confidentialité", "cle": "ip_confidentiality", "score": <0-100>, "nb_problemes": <entier> },
    { "nom": "Résolution des litiges", "cle": "dispute_resolution", "score": <0-100>, "nb_problemes": <entier> },
    { "nom": "Conditions de paiement", "cle": "payment_terms", "score": <0-100>, "nb_problemes": <entier> },
    { "nom": "Conformité RGPD / Loi 09-08", "cle": "rgpd_compliance", "score": <0-100>, "nb_problemes": <entier> }
  ],
  "clauses_manquantes": [<liste de strings, spécifiques au type_contrat détecté>],
  "risques": [
    {
      "clause": "<nom ou référence de l'article concerné>",
      "severite": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "categorie": "liability" | "termination" | "ip_confidentiality" | "dispute_resolution" | "payment_terms" | "rgpd_compliance",
      "description": "<explication concise du problème>",
      "reference_legale": "<référence légale précise si applicable, sinon omettre ce champ>"
    }
  ],
  "resume": "<résumé en 2-3 phrases de l'état général de conformité du contrat>"
}

Barème de sévérité (applique-le strictement) :
- CRITICAL : violation légale directe (RGPD, Loi 09-08, Code du travail) ou clause exposant à un risque financier/juridique majeur (ex : responsabilité illimitée, absence totale de clause de résiliation)
- HIGH : clause fortement déséquilibrée ou absente alors qu'elle est usuellement obligatoire dans ce type de contrat
- MEDIUM : clause présente mais imprécise, ambiguë, ou incomplète
- LOW : amélioration recommandée mais non bloquante (bonne pratique, clarté rédactionnelle)

Règles :
- Le type_contrat détecté doit influencer quelles clauses_manquantes et quels risques tu cherches (ex : ne signale pas l'absence de clause de préavis de licenciement pour un NDA)
- score_global et les scores par catégorie doivent refléter honnêtement la gravité (une catégorie avec un risque CRITICAL ne peut pas avoir un score > 40)
- nb_problemes = nombre réel de risques trouvés dans cette catégorie précise
- Si aucun problème dans une catégorie, score = 100 et nb_problemes = 0
- Chaque risque doit être concret et référencé au texte du contrat, jamais générique
- Classe chaque risque dans UNE SEULE catégorie (celle la plus pertinente)

CONTRAT :
${contractText}

Réponds uniquement avec le JSON, rien d'autre.`;

  const rawResponse = await askLLM(prompt);

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