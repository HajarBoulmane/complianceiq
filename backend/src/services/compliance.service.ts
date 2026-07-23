import prisma from "../prisma";

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

export async function askComplianceQuestion(
  question: string,
  topK?: number
): Promise<RagAnswer> {
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

export async function askAndSave(
  userId: number,
  question: string,
  conversationId?: number,
  topK?: number
) {
  const result = await askComplianceQuestion(question, topK);

  let conversation;
  if (conversationId) {
    conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");
  } else {
    conversation = await prisma.conversation.create({
      data: {
        userId,
        title: question.slice(0, 60),
      },
    });
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: question,
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: result.answer,
      sources: result.sources,
    },
  });

  return {
    conversationId: conversation.id,
    question: result.question,
    answer: result.answer,
    sources: result.sources,
  };
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

export async function analyzeAndSave(userId: number, contractText: string, filename?: string) {
  const { analysis } = await analyzeContractText(contractText);

  const document = await prisma.document.create({
    data: {
      userId,
      filename: filename || null,
      contractText,
      status: "processed",
    },
  });

  await prisma.analysis.create({
    data: {
      documentId: document.id,
      scoreGlobal: analysis.score_global,
      resume: analysis.resume,
      categories: analysis.categories,
      clausesManquantes: analysis.clauses_manquantes,
      findings: {
        create: analysis.risques.map((r: any) => ({
          clause: r.clause,
          severite: r.severite,
          description: r.description,
          referenceLegale: r.reference_legale || null,
        })),
      },
    },
  });

  return { documentId: document.id, analysis };
}

export async function getConversations(userId: number) {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, createdAt: true },
  });
}

export async function getConversationMessages(userId: number, conversationId: number) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");
  return conversation;
}

export async function getDocuments(userId: number) {
  return prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { analysis: true },
  });
}

export async function getDocumentAnalysis(userId: number, documentId: number) {
  const document = await prisma.document.findFirst({
    where: { id: documentId, userId },
    include: { analysis: { include: { findings: true } } },
  });
  if (!document) throw new Error("DOCUMENT_NOT_FOUND");
  return document;
}

export async function getDashboardStats(userId: number) {
  const documents = await prisma.document.findMany({
    where: { userId },
    include: { analysis: { include: { findings: true } } },
    orderBy: { createdAt: "desc" },
  });

  const conversationsCount = await prisma.conversation.count({ where: { userId } });

  const analyzedDocs = documents.filter((d) => d.analysis);
  const totalDocuments = analyzedDocs.length;

  const avgScore =
    totalDocuments > 0
      ? Math.round(
          analyzedDocs.reduce((sum, d) => sum + (d.analysis?.scoreGlobal || 0), 0) /
            totalDocuments
        )
      : 0;

  const conformeCount = analyzedDocs.filter((d) => (d.analysis?.scoreGlobal || 0) >= 70).length;
  const risqueCount = analyzedDocs.filter((d) => (d.analysis?.scoreGlobal || 0) < 40).length;
  const moyenCount = totalDocuments - conformeCount - risqueCount;

  // Activité par mois (12 derniers mois)
  const now = new Date();
  const monthlyActivity: { month: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = d.toLocaleDateString("fr-FR", { month: "short" });
    const count = analyzedDocs.filter((doc) => {
      const docDate = new Date(doc.createdAt);
      return docDate.getFullYear() === d.getFullYear() && docDate.getMonth() === d.getMonth();
    }).length;
    monthlyActivity.push({ month: monthKey, count });
  }

  // Agrégation par catégorie réglementaire
  const categoryTotals: Record<string, { totalScore: number; totalProblemes: number; count: number }> = {};
  analyzedDocs.forEach((doc) => {
    const categories = (doc.analysis?.categories as any[]) || [];
    categories.forEach((cat) => {
      if (!categoryTotals[cat.nom]) {
        categoryTotals[cat.nom] = { totalScore: 0, totalProblemes: 0, count: 0 };
      }
      categoryTotals[cat.nom].totalScore += cat.score;
      categoryTotals[cat.nom].totalProblemes += cat.nb_problemes;
      categoryTotals[cat.nom].count += 1;
    });
  });
  const categoriesAvg = Object.entries(categoryTotals).map(([nom, v]) => ({
    nom,
    score: Math.round(v.totalScore / v.count),
    nb_problemes: v.totalProblemes,
  }));

  // 5 derniers documents analysés
  const recentDocuments = analyzedDocs.slice(0, 5).map((d) => ({
    id: d.id,
    filename: d.filename,
    score: d.analysis?.scoreGlobal || 0,
    createdAt: d.createdAt,
  }));

  // 5 risques haute sévérité les plus récents (tous documents confondus)
  const allHighRisks = analyzedDocs
    .flatMap((d) =>
      (d.analysis?.findings || [])
        .filter((f) => f.severite === "haute")
        .map((f) => ({
          ...f,
          documentId: d.id,
          documentFilename: d.filename,
          createdAt: d.analysis?.createdAt,
        }))
    )
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, 5);

  return {
    totalDocuments,
    conversationsCount,
    avgScore,
    conformeCount,
    risqueCount,
    moyenCount,
    monthlyActivity,
    categoriesAvg,
    recentDocuments,
    recentHighRisks: allHighRisks,
  };
}