  import express , { Request, Response } from "express";
  import cors from "cors";
  import helmet from "helmet";
  import  morgan from "morgan";
  import dotenv from "dotenv";
  import authRoutes from "./routes/auth.routes";
  import complianceRoutes from "./routes/compliance.route";
  import cookieParser from "cookie-parser";


  dotenv.config();

  const app = express();

  app.set("trust proxy", 1);
  
  const PORT = process.env.PORT || 3000;


 app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
  app.use(cookieParser());
  app.use(helmet());
  app.use(morgan("dev"));
  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api/compliance", complianceRoutes);


  app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ 
      status: "ok",
      server: "complianceiq-backend",
      timestamp: new Date().toISOString()
  });
  });

  app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port ${process.env.PORT || 3000}`);
  });
