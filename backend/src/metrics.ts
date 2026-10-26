import type { Request, Response, NextFunction } from "express";
import { Registry, Histogram, Counter, collectDefaultMetrics } from "prom-client";

export const register = new Registry();
register.setDefaultLabels({ service: "complianceiq-backend" });
collectDefaultMetrics({ register }); // CPU, mémoire, event loop...

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Durée des requêtes HTTP",
  labelNames: ["method", "route", "status"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [register],
});

export const loginFailedTotal = new Counter({
  name: "security_login_failed_total",
  help: "Connexions échouées",
  registers: [register],
});

export const verifyCodeFailedTotal = new Counter({
  name: "security_verify_code_failed_total",
  help: "Codes de vérification invalides",
  registers: [register],
});

export const rateLimitHitTotal = new Counter({
  name: "security_rate_limit_hit_total",
  help: "Requêtes bloquées par un rate limiter",
  labelNames: ["limiter"],
  registers: [register],
});

// Le label "route" utilise le pattern Express (/conversations/:id), jamais l'URL brute :
// sinon un attaquant pourrait créer des milliers de séries en variant les URLs.
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : "unmatched";
    end({ method: req.method, route, status: String(res.statusCode) });
  });
  next();
}