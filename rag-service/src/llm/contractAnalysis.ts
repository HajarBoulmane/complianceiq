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

export type ObligationType = "RENEWAL" | "PAYMENT" | "NOTICE" | "OTHER";

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
    clause_suggeree?: string;
    referenceHallucinated?: boolean;
  }[];
  obligations: {
    type: ObligationType;
    description: string;
    date_echeance?: string;
  }[];
  resume: string;
  analysis_degraded?: boolean;
}

// ── Checklists par catégorie ────────────────────────────────────
const CATEGORY_CHECKLISTS: Record<string, { query: string; checklist: string[] }> = {
  liability: {
    query: "responsabilité contractuelle limitation dommages indemnisation",
    checklist: [
      "La responsabilité est-elle plafonnée, et si oui à quel niveau (trop bas expose le client, absence de plafond expose le prestataire) ?",
      "Les dommages indirects sont-ils exclus ? Si oui, est-ce équilibré ou unilatéral ?",
      "Existe-t-il une garantie / SLA sur le service livré, ou son absence totale ?",
      "Existe-t-il une clause pénale (indemnité forfaitaire) en cas de manquement ? Si oui, s'applique-t-elle aux deux parties ou à une seule ? Une clause pénale unilatérale, ou cumulable avec des dommages-intérêts complémentaires illimités, est un risque HIGH minimum.",
    ],
  },
  termination: {
    query: "préavis résiliation licenciement rupture de contrat indemnités Code du travail",
    checklist: [
      "Le préavis de résiliation est-il symétrique entre les deux parties ?",
      "Les conditions de résiliation pour faute sont-elles précises (délai de mise en demeure, définition du manquement grave) ?",
    ],
  },
  ip_confidentiality: {
    query: "propriété intellectuelle cession de droits licence confidentialité durée",
    checklist: [
      "La cession de PI est-elle totale et inconditionnelle, ou partielle/conditionnée (ex: liée au paiement) ?",
      "Si le prestataire conserve des droits sur des composants préexistants, une licence d'usage est-elle accordée au client sur ces composants ? Son absence est un risque HIGH minimum.",
      "La durée de l'obligation de confidentialité est-elle définie et suffisante (généralement 2-5 ans) ?",
      "L'obligation de confidentialité est-elle réciproque entre les deux parties, ou n'engage-t-elle qu'une seule partie ? Une obligation unilatérale alors que les deux parties échangent des informations sensibles est un risque HIGH minimum — sauf si le contrat est explicitement un NDA à sens unique où une seule partie divulgue réellement des informations (cas légitime, à justifier dans la description si tu l'exclus).",
    ],
  },
  dispute_resolution: {
    query: "résolution des litiges tribunal compétent arbitrage droit applicable",
    checklist: [
      "Le droit applicable et la juridiction compétente sont-ils clairement désignés ?",
    ],
  },
  payment_terms: {
    query: "conditions de paiement délais pénalités de retard rémunération",
    checklist: [
      "Les pénalités de retard sont-elles réciproques (client ET prestataire) ou unilatérales ?",
      "Le délai de paiement des factures est-il raisonnable et conforme aux pratiques (généralement 30-60 jours) ?",
    ],
  },
  rgpd_compliance: {
    query:
      "mesures de sécurité techniques et organisationnelles durée de conservation sous-traitance des données personnelles droits des personnes concernées consentement Loi 09-08 RGPD",
    checklist: [
      "Si le contrat mentionne un accès à des données personnelles ET qu'aucune mesure de sécurité technique/organisationnelle n'est précisée : c'est un risque de sévérité CRITICAL, sans exception. N'attribue pas MEDIUM à ce cas.",
      "Si aucune durée de conservation n'est définie : risque HIGH minimum.",
      "Si un tiers peut accéder aux données sans encadrement (accord de sous-traitance, autorisation préalable) : risque CRITICAL au titre de la Loi 09-08 / RGPD.",
      "Les droits des personnes concernées (accès, rectification, suppression) sont-ils mentionnés ? Absence = MEDIUM.",
    ],
  },
};

// ── Clauses attendues par type de contrat ───────────────────────
const EXPECTED_CLAUSES_BY_TYPE: Record<ContractType, string[]> = {
  prestation_service: [
    "Clause de garantie / SLA sur les livrables",
    "Clause de réversibilité (récupération des données/code en fin de contrat)",
    "Clause d'audit ou de contrôle qualité",
  ],
  nda: [
    "Durée de l'engagement de confidentialité",
    "Définition précise des informations confidentielles",
    "Clause de restitution/destruction des documents",
  ],
  cdi: [
    "Clause de préavis",
    "Clause de période d'essai",
    "Clause de non-concurrence (si applicable au poste)",
  ],
  cdd: [
    "Motif de recours au CDD",
    "Date de fin ou événement déclencheur",
    "Clause de renouvellement",
  ],
  bail: [
    "Clause de dépôt de garantie",
    "Répartition des charges",
    "Clause de révision du loyer",
  ],
  autre: [],
};

const MAX_CONTEXT_CHARS = 12000;
const MAX_CONTRACT_CHARS = 20000;

async function buildLegalContext(): Promise<{
  context: string;
  validSources: Set<string>;
}> {
  const results = await Promise.all(
    Object.entries(CATEGORY_CHECKLISTS).map(async ([categorie, { query }]) => {
      try {
        return await retrieveRelevantChunks(query, 3);
      } catch (err) {
        console.warn(
          `[buildLegalContext] Retrieval échoué pour la catégorie "${categorie}":`,
          err
        );
        return [];
      }
    })
  );

  const allChunks: RetrievedChunk[] = [];
  const seen = new Set<string>();
  for (const chunks of results) {
    for (const chunk of chunks) {
      const key = `${chunk.sourceFile}-${chunk.chunkIndex}`;
      if (!seen.has(key)) {
        seen.add(key);
        allChunks.push(chunk);
      }
    }
  }

  const validSources = new Set(allChunks.map((c) => c.sourceFile));

  if (allChunks.length === 0) {
    return { context: "(aucun contexte légal disponible)", validSources };
  }

  let context = allChunks
    .map((c, i) => `[Source ${i + 1} — ${c.sourceFile}]\n${c.text}`)
    .join("\n\n");

  if (context.length > MAX_CONTEXT_CHARS) {
    context = context.slice(0, MAX_CONTEXT_CHARS) + "\n\n[...contexte tronqué...]";
  }

  return { context, validSources };
}

const CHECKLIST_BLOCK = Object.entries(CATEGORY_CHECKLISTS)
  .map(([cle, { checklist }]) => `- ${cle} :\n${checklist.map((c) => `  · ${c}`).join("\n")}`)
  .join("\n");

const EXPECTED_CLAUSES_BLOCK = Object.entries(EXPECTED_CLAUSES_BY_TYPE)
  .filter(([, clauses]) => clauses.length > 0)
  .map(([type, clauses]) => `- ${type} : ${clauses.join(", ")}`)
  .join("\n");

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

Étape 2 : pour CHAQUE catégorie ci-dessous, vérifie explicitement les points du checklist correspondant. Un point de checklist non respecté ET non compensé ailleurs dans le contrat DOIT donner lieu à un risque, même s'il n'y a pas de chiffre ou de délai associé — l'absence d'une clause est un risque en soi, pas seulement sa présence mal rédigée. Quand un point précise une sévérité obligatoire, tu DOIS l'appliquer telle quelle ; ne la reclasse à la baisse que si le contrat contient une clause compensatoire explicite qui neutralise le risque, et justifie-le alors dans la description.

${CHECKLIST_BLOCK}

Étape 2bis : pour "clauses_manquantes", vérifie en priorité la liste de clauses attendues correspondant au type_contrat détecté à l'Étape 1 (ci-dessous) — n'ajoute une clause hors de cette liste que si son absence pose un risque juridique concret et spécifique à CE contrat :

${EXPECTED_CLAUSES_BLOCK}

Étape 3 : pour chaque risque identifié dans "risques", si tu peux formuler une clause de remplacement conforme, ajoute-la dans "clause_suggeree" — une clause réelle, prête à insérer dans le contrat, cohérente avec le CONTEXTE LÉGAL ci-dessus. Ne force jamais une suggestion si tu n'es pas sûr qu'elle soit juridiquement correcte : dans ce cas, omets simplement le champ.

Étape 4 : extrais dans "obligations" les échéances importantes du contrat (renouvellement/reconduction tacite, préavis, paiements récurrents ou dus à une date précise). N'inclus "date_echeance" QUE si une date concrète ou calculable (ex: "3 mois après signature" avec une date de signature indiquée) apparaît explicitement dans le texte — n'invente JAMAIS une date. Si aucune date n'est déterminable, inclus quand même l'obligation mais sans "date_echeance".

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
      "reference_legale": "<UNIQUEMENT si le CONTEXTE LÉGAL ci-dessus contient une source pertinente à ce risque précis — cite alors le nom exact de la source (ex: 'code-travail.pdf'). Si aucune source du contexte ne s'applique, OMETS ce champ entièrement — n'invente jamais de référence>",
      "clause_suggeree": "<OPTIONNEL — clause de remplacement conforme, voir Étape 3>"
    }
  ],
  "obligations": [
    {
      "type": "RENEWAL" | "PAYMENT" | "NOTICE" | "OTHER",
      "description": "<description concise de l'obligation>",
      "date_echeance": "<OPTIONNEL — format YYYY-MM-DD, voir Étape 4>"
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
- clause_suggeree ne doit JAMAIS être inventée sans base légale solide : mieux vaut l'omettre que de suggérer une clause incorrecte
- Dans clause_suggeree, ne propose JAMAIS un montant chiffré précis (MAD, %, jours) qui n'apparaît ni dans le contrat original ni dans le CONTEXTE LÉGAL — si tu n'as aucune base pour un chiffre concret, utilise une formulation qualitative (ex: "plafond de responsabilité raisonnable au regard de la valeur du contrat") plutôt qu'un nombre inventé
- date_echeance ne doit JAMAIS être inventée : mieux vaut omettre le champ que de deviner une date

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

function normalizeContractAnalysisPayload(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  const payload = value as Record<string, any>;

  if (Array.isArray(payload.risques)) {
    payload.risques = payload.risques.map((risk: any) => {
      const normalizedRisk = { ...risk };

      if (typeof normalizedRisk.clause === "string") {
        normalizedRisk.clause = normalizedRisk.clause.trim();
      }
      if (typeof normalizedRisk.description === "string") {
        normalizedRisk.description = normalizedRisk.description.trim();
      }
      if (typeof normalizedRisk.reference_legale === "string") {
        normalizedRisk.reference_legale = normalizedRisk.reference_legale.trim();
        if (!normalizedRisk.reference_legale) delete normalizedRisk.reference_legale;
      }
      if (typeof normalizedRisk.clause_suggeree === "string") {
        normalizedRisk.clause_suggeree = normalizedRisk.clause_suggeree.trim();
        if (!normalizedRisk.clause_suggeree) delete normalizedRisk.clause_suggeree;
      }

      return normalizedRisk;
    });
  }

  if (Array.isArray(payload.obligations)) {
    payload.obligations = payload.obligations.map((obligation: any) => {
      const normalizedObligation = { ...obligation };

      if (typeof normalizedObligation.description === "string") {
        normalizedObligation.description = normalizedObligation.description.trim();
      }
      if (typeof normalizedObligation.date_echeance === "string") {
        const date = normalizedObligation.date_echeance.trim();
        normalizedObligation.date_echeance = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
      }

      return normalizedObligation;
    });
  }

  return payload;
}

function groundReferences(
  risques: ContractAnalysisValidated["risques"],
  validSources: Set<string>
): ContractAnalysisValidated["risques"] {
  return risques.map((risque) => {
    if (risque.reference_legale && !validSources.has(risque.reference_legale)) {
      console.warn(
        `[groundReferences] Référence non fondée retirée: "${risque.reference_legale}" (absente du contexte légal récupéré)`
      );
      const { reference_legale, ...rest } = risque;
      return rest as ContractAnalysisValidated["risques"][number];
    }
    return risque;
  });
}

// ── Sévérités forcées ─────────────────────────────────────────────
// Le prompt demande au LLM d'appliquer certaines sévérités "sans exception"
// (ex: absence de mesures de sécurité RGPD/09-08 => CRITICAL), mais le modèle
// ne le respecte pas toujours. On corrige en post-traitement les cas où la
// description du risque correspond à un pattern qu'on sait devoir être
// CRITICAL, indépendamment de ce que le LLM a mis.
//
// Limite connue : ceci ne capte que les formulations proches des patterns
// listés. Si une formulation différente passe entre les mailles sur un
// futur test, ajoute-la simplement à la liste ci-dessous.
const FORCE_CRITICAL_PATTERNS: RegExp[] = [
  /absence.*mesures? de sécurité/i,
  /aucune mesure.*sécurité/i,
  /sans mesures? de sécurité/i,
  /sans encadrement.*sous-traitance/i,
];

function enforceForcedSeverities(
  risques: ContractAnalysisValidated["risques"]
): ContractAnalysisValidated["risques"] {
  return risques.map((r) => {
    if (r.categorie !== "rgpd_compliance") return r;
    const matches = FORCE_CRITICAL_PATTERNS.some((re) => re.test(r.description));
    if (matches && r.severite !== "CRITICAL") {
      console.warn(
        `[enforceForcedSeverities] Sévérité corrigée ${r.severite} → CRITICAL pour "${r.clause}"`
      );
      return { ...r, severite: "CRITICAL" as Severity };
    }
    return r;
  });
}

// ── Clamp score/sévérité ─────────────────────────────────────────
const SEVERITY_SCORE_CAP: Record<Severity, number> = {
  CRITICAL: 40,
  HIGH: 60,
  MEDIUM: 80,
  LOW: 100,
};

function clampCategoryScores(
  categories: ContractAnalysisValidated["categories"],
  risques: ContractAnalysisValidated["risques"]
): ContractAnalysisValidated["categories"] {
  return categories.map((cat) => {
    const catRisks = risques.filter((r) => r.categorie === cat.cle);
    if (catRisks.length === 0) return cat;

    const order: Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    const worstSeverity = catRisks.reduce<Severity>(
      (worst, r) => (order.indexOf(r.severite) > order.indexOf(worst) ? r.severite : worst),
      "LOW"
    );

    const cap = SEVERITY_SCORE_CAP[worstSeverity];
    return {
      ...cat,
      score: Math.min(cat.score, cap),
      nb_problemes: catRisks.length,
    };
  });
}

async function callAndValidate(
  contractText: string,
  legalContext: string,
  validSources: Set<string>
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

  const normalizedJson = normalizeContractAnalysisPayload(parsedJson);
  const result = ContractAnalysisSchema.safeParse(normalizedJson);
  if (!result.success) {
    return {
      ok: false,
      rawResponse,
      error: result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(" | "),
    };
  }

  const grounded: ContractAnalysisValidated = {
    ...result.data,
    risques: groundReferences(result.data.risques, validSources),
  };
  grounded.risques = enforceForcedSeverities(grounded.risques);
  grounded.categories = clampCategoryScores(grounded.categories, grounded.risques);

  return { ok: true, data: grounded };
}

function buildFallbackAnalysis(contractText: string): ContractAnalysisResult {
  return {
    type_contrat: "autre",
    type_contrat_label: "Contrat non classé",
    score_global: 0,
    categories: [
      { nom: "Responsabilité", cle: "liability", score: 0, nb_problemes: 0 },
      { nom: "Résiliation", cle: "termination", score: 0, nb_problemes: 0 },
      { nom: "Propriété intellectuelle & Confidentialité", cle: "ip_confidentiality", score: 0, nb_problemes: 0 },
      { nom: "Résolution des litiges", cle: "dispute_resolution", score: 0, nb_problemes: 0 },
      { nom: "Conditions de paiement", cle: "payment_terms", score: 0, nb_problemes: 0 },
      { nom: "Conformité RGPD / Loi 09-08", cle: "rgpd_compliance", score: 0, nb_problemes: 0 },
    ],
    clauses_manquantes: [],
    risques: [],
    obligations: [],
    resume:
      "L'analyse automatique a échoué et n'a pas pu être validée. Ce résultat est un stub — aucun score ni risque réel n'a été calculé. Veuillez réessayer ou contacter le support.",
    analysis_degraded: true,
  };
}

export async function analyzeContract(
  contractText: string
): Promise<ContractAnalysisResult> {
  let boundedContractText = contractText;
  if (contractText.length > MAX_CONTRACT_CHARS) {
    console.warn(
      `[analyzeContract] contrat tronqué de ${contractText.length} à ${MAX_CONTRACT_CHARS} caractères`
    );
    boundedContractText = contractText.slice(0, MAX_CONTRACT_CHARS);
  }

  const { context: legalContext, validSources } = await buildLegalContext();

  let attempt = await callAndValidate(boundedContractText, legalContext, validSources);

  if (!attempt.ok) {
    console.warn(
      `[analyzeContract] Validation échouée (tentative 1): ${attempt.error}. Nouvelle tentative...`
    );
    attempt = await callAndValidate(boundedContractText, legalContext, validSources);
  }

  if (!attempt.ok) {
    console.error(
      `[analyzeContract] Validation échouée après 2 tentatives: ${attempt.error}`
    );
    console.error(
      `[analyzeContract] Réponse brute: ${attempt.rawResponse.slice(0, 500)}`
    );
    return buildFallbackAnalysis(contractText);
  }

  return attempt.data;
}