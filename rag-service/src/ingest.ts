import path from "path";
import { loadAllPdfsFromDir } from "./ingestion/loader";
import { chunkText } from "./chunking/chunker";
import { embedText } from "./embeddings/embedder";
import { addVectors, VectorRecord } from "./vectordb/chromaClient";

async function main() {
  const dataDir = path.join(__dirname, "..", "data", "raw");
  const docs = await loadAllPdfsFromDir(dataDir);

  for (const doc of docs) {
    const chunks = chunkText(doc.text, doc.fileName);
    console.log(`${doc.fileName} — ${chunks.length} chunks à embedder...`);

    const records: VectorRecord[] = [];

    for (const chunk of chunks) {
      const embedding = await embedText(chunk.text);
      records.push({
        id: `${doc.fileName}-${chunk.chunkIndex}`,
        text: chunk.text,
        embedding,
        metadata: {
          sourceFile: chunk.sourceFile,
          chunkIndex: chunk.chunkIndex,
        },
      });
    }

    await addVectors(records);
    console.log(`${doc.fileName} — ${records.length} vecteurs stockés dans ChromaDB ✓`);
  }

  console.log("Ingestion complète terminée !");

}

main();
