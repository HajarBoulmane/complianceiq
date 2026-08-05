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

// Parse "YYYY-MM-DD" from the LLM safely — never trust it blindly,
// an invalid/impossible date should become "no date" not a crash.
function parseObligationDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export async function analyzeAndSave(
  userId: number,
  contractText: string,
  filename?: string
) {
  // La partie coûteuse (appel LLM) reste HORS de la transaction —
  // on ne veut pas garder une transaction DB ouverte pendant plusieurs secondes.
  const { analysis } = await analyzeContractText(contractText);

  const { document, obligations, hasSuggestedClauses } = await prisma.$transaction(
    async (tx) => {
      const document = await tx.document.create({
        data: {
          userId,
          filename: filename || null,
          contractText,
          status: "processed",
        },
      });

      await tx.analysis.create({
        data: {
          documentId: document.id,
          scoreGlobal: analysis.score_global,
          resume: analysis.resume,
          categories: analysis.categories,
          clausesManquantes: analysis.clauses_manquantes,
          typeContrat: analysis.type_contrat,
          typeContratLabel: analysis.type_contrat_label,
          findings: {
            create: analysis.risques.map((r: any) => ({
              clause: r.clause,
              severite: r.severite,
              categorie: r.categorie,
              description: r.description,
              referenceLegale: r.reference_legale || null,
              suggestedClause: r.clause_suggeree || null,
            })),
          },
        },
      });

      // Obligations : on garde celles sans date aussi (dueDate nullable),
      // on ne les jette pas juste parce que le LLM n'a pas trouvé de date.
      const obligationsData = (analysis.obligations || []).map((o: any) => ({
        documentId: document.id,
        type: o.type,
        description: o.description,
        dueDate: parseObligationDate(o.date_echeance),
      }));

      let createdObligations: { id: number; dueDate: Date | null; type: string }[] = [];
      if (obligationsData.length > 0) {
        await tx.obligation.createMany({ data: obligationsData });
        createdObligations = await tx.obligation.findMany({
          where: { documentId: document.id },
          select: { id: true, dueDate: true, type: true },
        });
      }

      const hasSuggestedClauses = analysis.risques.some((r: any) => r.clause_suggeree);

      // Notifications : une par obligation datée, plus une si des clauses
      // suggérées existent — générées ici, pas dans un job séparé pour l'instant.
      const notificationsData: {
        userId: number;
        documentId: number;
        type: string;
        message: string;
      }[] = [];

      for (const ob of createdObligations) {
        if (ob.dueDate) {
          notificationsData.push({
            userId,
            documentId: document.id,
            type: ob.type === "PAYMENT" ? "PAYMENT_DUE" : "RENEWAL_DUE",
            message: `Échéance à venir (${ob.type}) le ${ob.dueDate.toISOString().slice(0, 10)} pour ${
              filename || "un contrat"
            }`,
          });
        }
      }

      if (hasSuggestedClauses) {
        notificationsData.push({
          userId,
          documentId: document.id,
          type: "CLAUSE_SUGGESTED",
          message: `Des reformulations de clauses conformes sont disponibles pour ${
            filename || "un contrat"
          }`,
        });
      }

      if (notificationsData.length > 0) {
        await tx.notification.createMany({ data: notificationsData });
      }

      return {
        document,
        obligations: createdObligations,
        hasSuggestedClauses,
      };
    }
  );

  return { documentId: document.id, analysis, obligations, hasSuggestedClauses };
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
    include: { analysis: { include: { findings: true } }, obligations: true },
  });
  if (!document) throw new Error("DOCUMENT_NOT_FOUND");
  return document;
}

// NOUVEAU : obligations à venir, tous documents confondus, pour le dashboard.
export async function getUpcomingObligations(userId: number, withinDays = 30) {
  const now = new Date();
  const limit = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

  return prisma.obligation.findMany({
    where: {
      status: "pending",
      dueDate: { not: null, gte: now, lte: limit },
      document: { userId },
    },
    include: { document: { select: { filename: true } } },
    orderBy: { dueDate: "asc" },
  });
}

// NOUVEAU : notifications pour le header (cloche).
export async function getNotifications(userId: number, unreadOnly = false) {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notification) throw new Error("NOTIFICATION_NOT_FOUND");

  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
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

  const recentDocuments = analyzedDocs.slice(0, 5).map((d) => ({
    id: d.id,
    filename: d.filename,
    score: d.analysis?.scoreGlobal || 0,
    createdAt: d.createdAt,
  }));

  // 5 risques haute sévérité les plus récents (tous documents confondus)
    // Les valeurs persistées sont "CRITICAL" ou "HIGH".
    const allHighRisks = analyzedDocs
      .flatMap((d) =>
        (d.analysis?.findings || [])
          .filter((f) => f.severite === "CRITICAL" || f.severite === "HIGH")
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

export async function deleteConversation(userId: number, conversationId: number) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });
  if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");

  await prisma.$transaction([
    prisma.message.deleteMany({ where: { conversationId } }),
    prisma.conversation.delete({ where: { id: conversationId } }),
  ]);
}