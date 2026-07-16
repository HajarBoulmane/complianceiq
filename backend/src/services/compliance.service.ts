const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || "http://localhost:4000";

export interface RagAnswer {
  question: string;
  answer: string;
  sources: {
    sourceFile: string;
    chunkIndex: number;
    distance: number | null;
  }[];
}

export async function askComplianceQuestion(question: string, topK?: number): Promise<RagAnswer> {
  const response = await fetch(`${RAG_SERVICE_URL}/api/rag/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, topK }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`rag-service error: ${response.status} — ${errorText}`);
  }

  return response.json();
}

export async function analyzeContractText(contractText: string) {
  const response = await fetch(`${RAG_SERVICE_URL}/api/rag/analyze-contract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contractText }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`rag-service error: ${response.status} — ${errorText}`);
  }

  return response.json();
}