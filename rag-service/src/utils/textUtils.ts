/**
 * Retire les références de citation du type "(Source 3)", "[Extrait 2]",
 * "(Sources 1, 4)" ou "(Source 1 et Source 4)" d'un texte généré par le LLM.
 */
export function stripInlineCitations(text: string): string {
  return text
    .replace(
      /\s*[\(\[]\s*(?:sources?|extraits?)\s*\d+(?:\s*(?:,|et|and|&|-|à)\s*(?:(?:sources?|extraits?)\s*)?\d+)*\s*[\)\]]/gi,
      ""
    )
    .replace(/\s+([.,])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}