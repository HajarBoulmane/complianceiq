import dotenv from "dotenv";
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = process.env.GROQ_API_URL || "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODELS = [
  process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
];

// Statuts pour lesquels on essaie le modèle suivant :
// 400/404 = modèle ou paramètre non supporté
// 413/429 = limite de tokens ou de débit (les limites Groq sont par modèle)
const FALLBACK_STATUSES = [400, 404, 413, 429];

export async function askLLM(
  prompt: string,
  options: { jsonMode?: boolean; maxTokens?: number } = {}
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY manquante dans .env");
  }

  let lastError: string | null = null;

  for (const model of DEFAULT_MODELS) {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: options.maxTokens ?? 1000,
        ...(options.jsonMode && { response_format: { type: "json_object" } }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      lastError = `Model ${model}: ${response.status} — ${errorText}`;
      if (!FALLBACK_STATUSES.includes(response.status)) {
        throw new Error(`Groq API error: ${lastError}`);
      }
      console.warn(`[askLLM] ${lastError.slice(0, 300)} — essai du modèle suivant`);
      continue;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("Réponse Groq invalide : contenu vide ou non textuel");
    }

    return content;
  }

  throw new Error(
    lastError ? `Groq API error: ${lastError}` : "Groq API error: aucun modèle compatible trouvé"
  );
}