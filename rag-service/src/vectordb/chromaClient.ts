import { ChromaClient } from "chromadb";

const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";

const client = new ChromaClient({
  path: CHROMA_URL,
});

const COLLECTION_NAME = "complianceiq_regulations";

export async function getOrCreateCollection() {
  const collection = await client.getOrCreateCollection({
    name: COLLECTION_NAME,
    embeddingFunction: null as any,
  });
  return collection;
}

export interface VectorRecord {
  id: string;
  text: string;
  embedding: number[];
  metadata: {
    sourceFile: string;
    chunkIndex: number;
  };
}

export async function addVectors(records: VectorRecord[]) {
  const collection = await getOrCreateCollection();

  await collection.add({
    ids: records.map((r) => r.id),
    embeddings: records.map((r) => r.embedding),
    documents: records.map((r) => r.text),
    metadatas: records.map((r) => r.metadata),
  });
}

export async function queryVectors(queryEmbedding: number[], nResults: number = 5) {
  const collection = await getOrCreateCollection();

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults,
  });

  return results;
}