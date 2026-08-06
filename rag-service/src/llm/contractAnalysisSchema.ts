import { z } from "zod";

export const ContractTypeSchema = z.enum([
  "nda",
  "cdi",
  "cdd",
  "prestation_service",
  "bail",
  "autre",
]);

export const SeveritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

export const CategoryKeySchema = z.enum([
  "liability",
  "termination",
  "ip_confidentiality",
  "dispute_resolution",
  "payment_terms",
  "rgpd_compliance",
]);

export const ObligationTypeSchema = z.enum([
  "RENEWAL",
  "PAYMENT",
  "NOTICE",
  "OTHER",
]);

const CategorySchema = z.object({
  nom: z.string().min(1),
  cle: CategoryKeySchema,
  score: z.number().min(0).max(100),
  nb_problemes: z.number().int().min(0),
});

const RiskSchema = z.object({
  clause: z.string().min(1),
  severite: SeveritySchema,
  categorie: CategoryKeySchema,
  description: z.string().min(1),
  reference_legale: z.string().min(1).optional(),
  clause_suggeree: z.string().min(1).optional(),
  // Posé uniquement par groundReferences() après coup, jamais par le LLM —
  // signale une reference_legale retirée car non retrouvée dans le contexte
  // légal récupéré (hallucination probable).
  referenceHallucinated: z.boolean().optional(),
});

const ObligationSchema = z.object({
  type: ObligationTypeSchema,
  description: z.string().min(1),
  date_echeance: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu: YYYY-MM-DD")
    .optional(),
});

export const ContractAnalysisSchema = z
  .object({
    type_contrat: ContractTypeSchema,
    type_contrat_label: z.string().min(1),
    score_global: z.number().min(0).max(100),
    categories: z.array(CategorySchema).length(6),
    clauses_manquantes: z.array(z.string()),
    risques: z.array(RiskSchema),
    obligations: z.array(ObligationSchema),
    resume: z.string().min(1),
    // Jamais posé par le LLM — uniquement par buildFallbackAnalysis quand
    // les 2 tentatives de validation ont échoué.
    analysis_degraded: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    for (const cat of data.categories) {
      const hasCritical = data.risques.some(
        (r) => r.categorie === cat.cle && r.severite === "CRITICAL"
      );
      if (hasCritical && cat.score > 40) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["categories"],
          message: `Incohérence: catégorie "${cat.cle}" a un risque CRITICAL mais un score de ${cat.score} (devrait être <= 40)`,
        });
      }
    }
  });

export type ContractAnalysisValidated = z.infer<typeof ContractAnalysisSchema>;