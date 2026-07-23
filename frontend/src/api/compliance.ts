import apiClient from "./client";

export interface RagSource {
  sourceFile: string;
  chunkIndex: number;
  distance: number | null;
}

export interface AskResponse {
  question: string;
  answer: string;
  sources: RagSource[];
  conversationId?: number;
}

export interface Conversation {
  id: number;
  title?: string;
  createdAt?: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: RagSource[];
}

export interface RiskItem {
  clause: string;
  severite: "haute" | "moyenne" | "basse";
  description: string;
  reference_legale?: string;
}
export interface DashboardStats {
  totalDocuments: number;
  conversationsCount: number;
  avgScore: number;
  conformeCount: number;
  risqueCount: number;
  moyenCount: number;
  monthlyActivity: { month: string; count: number }[];
  categoriesAvg: { nom: string; score: number; nb_problemes: number }[];
  recentDocuments: { id: number; filename: string | null; score: number; createdAt: string }[];
  recentHighRisks: {
    clause: string;
    description: string;
    documentId: number;
    documentFilename: string | null;
    referenceLegale?: string;
  }[];
}

export const getDashboardStats = () =>
  apiClient<DashboardStats>("/compliance/stats", { method: "GET" });

export interface LoginPayload {
  email: string;
  password: string;
}
export interface CategoryScore {
  nom: string;
  score: number;
  nb_problemes: number;
}

export interface ContractAnalysis {
  score_global: number;
  categories: CategoryScore[];
  clauses_manquantes: string[];
  risques: RiskItem[];
  resume: string;
}

export interface AnalyzeResponse {
  analysis: ContractAnalysis;
}

export const listConversations = () =>
  apiClient<{ conversations: Conversation[] }>("/compliance/conversations", {
    method: "GET",
  });

export const getConversationMessages = (conversationId: number) =>
  apiClient<{ conversation: { messages: ConversationMessage[] } }>(
    `/compliance/conversations/${conversationId}`,
    { method: "GET" }
  );

export const askQuestion = (question: string, conversationId?: number, topK?: number) =>
  apiClient<AskResponse>("/compliance/ask", {
    method: "POST",
    body: { question, conversationId, topK },
  });

export async function analyzeContract(contractText: string, filename?: string) {
  return apiClient<{ analysis: ContractAnalysis }>("/compliance/analyze-contract", {
    method: "POST",
    body: { contractText, filename },
  });
}