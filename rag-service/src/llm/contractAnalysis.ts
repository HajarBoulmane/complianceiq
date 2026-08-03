import { askLLM } from "./llmClient";
import { retrieveRelevantChunks, RetrievedChunk } from "../retrieval/retriever";
import {
  ContractAnalysisSchema,
  type ContractAnalysisValidated,
} from "./contractAnalysisSchema";

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
    cle: string;
    score: number;
    nb_problemes: number;
  }[];
  clauses_manquantes: string[];
  risques: {
    clause: string;
    severite: Severity;
    categorie: string;
    description: string;
    reference_legale?: string;
  }[];
  resume: string;
}

// --- NOUVEAU : queries de retrieval par catégorie ---
const CATEGORY_QUERIES: Record<string, string> = {
  liability:
    "responsabilité contractuelle limitation dommages indemnisation",
  termination:
    "préavis résiliation licenciement rupture de contrat indemnités Code du travail",
  ip_confidentiality:
    "confidentialité propriété intellectuelle protection des données personnelles Loi 09-08",
  dispute_resolution:
    "résolution des litiges tribunal compétent arbitrage droit applicable",
  payment_terms:
    "conditions de paiement délais pénalités de retard rémunération",
  rgpd_compliance:
    "obligations RGPD Loi 09-08 protection des données personnelles consentement",
};

// --- NOUVEAU : récupère et dédoublonne les chunks pertinents pour toutes les catégories ---
async function buildLegalContext(): Promise<string> {
  const allChunks: RetrievedChunk[] = [];
  const seen = new Set<string>();

  for (const [categorie, query] of Object.entries(CATEGORY_QUERIES)) {
    try {
      const chunks = await retrieveRelevantChunks(query, 3);
      for (const chunk of chunks) {
        const key = `${chunk.sourceFile}-${chunk.chunkIndex}`;
        if (!seen.has(key)) {
          seen.add(key);
          allChunks.push(chunk);
        }
      }
    } catch (err) {
      console.warn(
        `[buildLegalContext] Retrieval échoué pour la catégorie "${categorie}":`,
        err
      );
      // on continue avec les autres catégories, pas de crash total
    }
  }

  if (allChunks.length === 0) {
    return "(aucun contexte légal disponible)";
  }

  return allChunks
    .map(
      (c, i) =>
        `[Source ${i + 1} — ${c.sourceFile}]\n${c.text}`
    )
    .join("\n\n");
}

// --- MODIFIÉ : le template prend maintenant legalContext en paramètre ---
const ANALYSIS_PROMPT_TEMPLATE = (
  contractText: string,
  legalContext: string
) => `Tu es un expert en conformité juridique pour les PME marocaines (droit du travail, protection des données Loi 09-08, RGPD).

Voici des extraits de textes légaux pertinents, récupérés depuis une base de référence (droit du travail marocain, Loi 09-08, RGPD) :

--- CONTEXTE LÉGAL ---
${legalContext}
--- FIN CONTEXTE LÉGAL ---

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
      "reference_legale": "<UNIQUEMENT si le CONTEXTE LÉGAL ci-dessus contient une source pertinente à ce risque précis — cite alors le nom exact de la source (ex: 'code-travail.pdf'). Si aucune source du contexte ne s'applique, OMETS ce champ entièrement — n'invente jamais de référence>"
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
- reference_legale ne doit JAMAIS être inventée : uniquement si une source du CONTEXTE LÉGAL s'applique directement

CONTRAT :
${contractText}

Réponds uniquement avec le JSON, rien d'autre.`;

function cleanLlmJson(rawResponse: string): string {
  return rawResponse
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
}

// --- MODIFIÉ : callAndValidate prend maintenant legalContext ---
async function callAndValidate(
  contractText: string,
  legalContext: string
): Promise<
  | { ok: true; data: ContractAnalysisValidated }
  | { ok: false; rawResponse: string; error: string }
> {
  const rawResponse = await askLLM(
    ANALYSIS_PROMPT_TEMPLATE(contractText, legalContext)
  );
  const cleaned = cleanLlmJson(rawResponse);

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch {
    return {
      ok: false,
      rawResponse,
      error: "JSON invalide (parse a échoué)",
    };
  }

  const result = ContractAnalysisSchema.safeParse(parsedJson);
  if (!result.success) {
    return {
      ok: false,
      rawResponse,
      error: result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(" | "),
    };
  }

  return { ok: true, data: result.data };
}

// --- MODIFIÉ : analyzeContract construit le contexte légal avant tout ---
export async function analyzeContract(
  contractText: string
): Promise<ContractAnalysisResult> {
  const legalContext = await buildLegalContext();

  // 1ère tentative
  let attempt = await callAndValidate(contractText, legalContext);

  // Le LLM peut mal formater par accident (JSON tronqué, champ en trop) —
  // un seul retry suffit dans la grande majorité des cas avant d'abandonner.
  if (!attempt.ok) {
    console.warn(
      `[analyzeContract] Validation échouée (tentative 1): ${attempt.error}. Nouvelle tentative...`
    );
    attempt = await callAndValidate(contractText, legalContext);
  }

  if (!attempt.ok) {
    console.error(
      `[analyzeContract] Validation échouée après 2 tentatives: ${attempt.error}`
    );
    console.error(
      `[analyzeContract] Réponse brute: ${attempt.rawResponse.slice(0, 500)}`
    );
    throw new Error(
      "L'analyse n'a pas pu être générée de manière fiable. Veuillez réessayer."
    );
  }

  return attempt.data;
}