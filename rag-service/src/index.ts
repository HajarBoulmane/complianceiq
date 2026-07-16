import express from "express";
import dotenv from "dotenv";
import ragRoutes from "./api/route";

dotenv.config();

const app = express();
const PORT = process.env.RAG_PORT || 4000;

app.use(express.json());
app.use("/api/rag", ragRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "rag-service" });
});

app.listen(PORT, () => {
  console.log(`RAG service running on port ${PORT}`);
});