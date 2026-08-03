import rateLimit from "express-rate-limit";

// Limite générale : évite qu'un compte spam l'API
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: { error: "Trop de requêtes, réessayez plus tard." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limite stricte pour l'analyse de contrat : appelle un LLM (coûte cher, lent)
export const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Trop d'analyses effectuées, réessayez dans quelques minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});