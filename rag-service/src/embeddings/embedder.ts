let embedder: any = null;

async function getEmbedder() {
  if (!embedder) {
    const { pipeline } = await import("@huggingface/transformers");
    embedder = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      { dtype: "q8" } // garde le comportement quantifié de l'ancienne version
    );
  }
  return embedder;
}

export async function embedText(text: string): Promise<number[]> {
  const model = await getEmbedder();
  const output = await model(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const text of texts) {
    const vector = await embedText(text);
    embeddings.push(vector);
  }
  return embeddings;
}