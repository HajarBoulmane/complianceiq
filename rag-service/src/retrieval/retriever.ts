import { embedText } from "../embeddings/embedder";
import { queryVectors } from "../vectordb/chromaClient";

export interface RetrievedChunk {
  text: string;
  sourceFile: string;
  chunkIndex: number;
  distance: number | null;
}

export async function retrieveRelevantChunks(
  query: string,
  topK: number = 5
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedText(query);
  const results = await queryVectors(queryEmbedding, topK);

  const chunks: RetrievedChunk[] = [];

  const documents = results.documents?.[0] || [];
  const metadatas = results.metadatas?.[0] || [];
  const distances = results.distances?.[0] || [];

  for (let i = 0; i < documents.length; i++) {
    chunks.push({
      text: documents[i] as string,
      sourceFile: (metadatas[i] as any)?.sourceFile,
      chunkIndex: (metadatas[i] as any)?.chunkIndex,
      distance: distances[i] ,
    });
  }

  return chunks;
}