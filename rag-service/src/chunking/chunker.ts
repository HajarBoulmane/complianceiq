export interface Chunk {
  text: string;
  chunkIndex: number;
  sourceFile: string;
}

interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}

export function chunkText(
  text: string,
  sourceFile: string,
  options: ChunkOptions = {}
): Chunk[] {
  const { chunkSize = 800, overlap = 100 } = options;
  const chunks: Chunk[] = [];

  let start = 0;
  let chunkIndex = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunkContent = text.slice(start, end).trim();

    if (chunkContent.length > 0) {
      chunks.push({
        text: chunkContent,
        chunkIndex,
        sourceFile,
      });
      chunkIndex++;
    }

    start += chunkSize - overlap;
  }

  return chunks;
}