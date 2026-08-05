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

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type ContractType =
  | "nda"
  | "cdi"
  | "cdd"
  | "prestation_service"
  | "bail"
  | "autre";

export interface RiskItem {
  clause: string;
  severite: Severity;
  categorie: string;
  description: string;
  reference_legale?: string;
  clause_suggeree?: string;
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
  type_contrat: ContractType;
  type_contrat_label: string;
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

export interface DocumentWithAnalysis {
  id: number;
  filename: string | null;
  analysis: {
    scoreGlobal: number;
    resume: string;
    categories: CategoryScore[];
    clausesManquantes: string[];
    typeContrat: ContractType;
    typeContratLabel: string;
    findings: {
      clause: string;
      severite: Severity;
      categorie: string;
      description: string;
      referenceLegale: string | null;
      suggestedClause: string | null;
    }[];
  } | null;
}

export const getDocumentAnalysis = (documentId: number) =>
  apiClient<{ document: DocumentWithAnalysis }>(
    `/compliance/documents/${documentId}`,
    { method: "GET" }
  );

export function mapDocumentToAnalysis(
  document: DocumentWithAnalysis
): ContractAnalysis | null {
  if (!document.analysis) return null;
  const a = document.analysis;
  return {
    type_contrat: a.typeContrat,
    type_contrat_label: a.typeContratLabel,
    score_global: a.scoreGlobal,
    categories: a.categories,
    clauses_manquantes: a.clausesManquantes,
    risques: a.findings.map((f) => ({
      clause: f.clause,
      severite: f.severite,
      categorie: f.categorie,
      description: f.description,
      reference_legale: f.referenceLegale || undefined,
      clause_suggeree: f.suggestedClause || undefined,
    })),
    resume: a.resume,
  };
}

export const deleteConversation = (conversationId: number) =>
  apiClient<void>(`/compliance/conversations/${conversationId}`, {
    method: "DELETE",
  });

export interface Obligation {
  id: number;
  type: "RENEWAL" | "PAYMENT" | "NOTICE" | "OTHER";
  description: string;
  dueDate: string | null;
  status: string;
  document?: { filename: string | null };
}

export async function getUpcomingObligations(withinDays = 30): Promise<{ obligations: Obligation[] }> {
  return apiClient<{ obligations: Obligation[] }>(`/compliance/obligations?withinDays=${withinDays}`, {
    method: "GET",
  });
}

export type NotificationType = "RENEWAL_DUE" | "PAYMENT_DUE" | "CLAUSE_SUGGESTED";

export interface NotificationItem {
  id: number;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: string;
  documentId?: number | null;
}

export const getNotifications = (unreadOnly?: boolean) =>
  apiClient<{ notifications: NotificationItem[] }>(
    `/compliance/notifications${unreadOnly ? "?unreadOnly=true" : ""}`,
    { method: "GET" }
  );

export const markNotificationRead = (notificationId: number) =>
  apiClient<{ notification: NotificationItem }>(
    `/compliance/notifications/${notificationId}/read`,
    { method: "PATCH" }
  );