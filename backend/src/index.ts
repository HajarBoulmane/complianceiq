import "dotenv/config"; // TOUJOURS en premier
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import complianceRoutes from "./routes/compliance.route";

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === "production";

// Seulement si un reverse proxy (Caddy/Nginx) est devant l'API
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(morgan(isProd ? "combined" : "dev"));
app.use(cookieParser());

app.use("/api/auth", express.json({ limit: "10kb" }), authRoutes);
app.use("/api/compliance", express.json({ limit: "2mb" }), complianceRoutes);

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    server: "complianceiq-backend",
    timestamp: new Date().toISOString(),
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Gestionnaire d'erreurs global (4 arguments obligatoires pour qu'Express le reconnaisse)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Payload too large" });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});