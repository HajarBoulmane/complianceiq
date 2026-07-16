import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";

export interface LoadedDocument {
  fileName: string;
  text: string;
  numPages: number;
}

export async function loadPdf(filePath: string): Promise<LoadedDocument> {
  const buffer = fs.readFileSync(filePath);
  const pdfParser = new PDFParse({ data: buffer });
  const data = await pdfParser.getText();

  return {
    fileName: path.basename(filePath),
    text: data.text,
    numPages: data.total,
  };
}

export async function loadAllPdfsFromDir(dirPath: string): Promise<LoadedDocument[]> {
  const files = fs.readdirSync(dirPath).filter((f: string) => f.endsWith(".pdf"));
  const documents: LoadedDocument[] = [];

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const doc = await loadPdf(fullPath);
    documents.push(doc);
  }

  return documents;
}