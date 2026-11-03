// Server-only Gemini client. Never import this from route files or *.functions.ts at the
// top level (those ship to the browser); load it inside handlers with `await import(...)`.
import { geminiResponseSchema } from "./insights";

// "gemini-flash-lite-latest" is Google's alias for the current Flash-Lite model: the
// lightest, cheapest tier, with more generous per-minute limits. That's plenty for a short
// structured action plan. Set GEMINI_MODEL to override it (e.g. "gemini-flash-latest" for
// the larger Flash model, or a pinned model ID for stable output across Google updates).
const DEFAULT_MODEL = "gemini-flash-lite-latest";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 30_000;

export class AiNotConfiguredError extends Error {}
export class AiUnavailableError extends Error {}
/** Gemini said "too many requests" (HTTP 429): per-minute or daily quota on the API key. */
export class AiBusyError extends Error {}

export function isAiConfigured(): boolean {
  return Boolean(process.env["GEMINI_API_KEY"]);
}

export function geminiModel(): string {
  return process.env["GEMINI_MODEL"] || DEFAULT_MODEL;
}

type GenerateArgs = { system: string; prompt: string };

/** Calls Gemini in JSON mode and returns the raw JSON text of the first candidate. */
export async function generateJson({ system, prompt }: GenerateArgs): Promise<string> {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) throw new AiNotConfiguredError("GEMINI_API_KEY is not set");

  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/${encodeURIComponent(geminiModel())}:generateContent`, {
      method: "POST",
      // Key in a header, not the URL, so it never lands in request logs.
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          responseSchema: geminiResponseSchema,
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    throw new AiUnavailableError(`Gemini request failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (!res.ok) {
    // Log status and body server-side for debugging; never echo provider errors to users.
    console.error(`[gemini] HTTP ${res.status} (${geminiModel()}): ${(await res.text()).slice(0, 500)}`);
    if (res.status === 429) throw new AiBusyError("Gemini rate limit reached");
    throw new AiUnavailableError(`Gemini returned HTTP ${res.status}`);
  }

  const body = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  const candidate = body.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) {
    console.error("[gemini] empty response", body.promptFeedback?.blockReason ?? candidate?.finishReason);
    throw new AiUnavailableError("Gemini returned no content");
  }
  return text;
}
