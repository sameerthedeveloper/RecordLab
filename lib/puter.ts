/**
 * Client-side AI text generation via Puter.js (https://js.puter.com/v2/) —
 * no API key required. The `puter` global is injected by the script tag in
 * app/layout.tsx.
 */

export interface PuterChatOptions {
  model?: string;
  stream?: boolean;
}

interface PuterChatChunk {
  text?: string;
}

interface PuterGlobal {
  ai: {
    chat: (
      prompt: string,
      options?: PuterChatOptions
    ) => Promise<string | { message?: { content?: string } } | AsyncIterable<PuterChatChunk>>;
  };
}

declare global {
  interface Window {
    puter?: PuterGlobal;
  }
}

/** Models tried in order when no explicit model is requested. */
export const PUTER_MODEL_FALLBACK_CHAIN = ["gpt-4o", "claude-3-5-sonnet"];

function getPuter(): PuterGlobal {
  if (typeof window === "undefined" || !window.puter) {
    throw new Error("Puter.js is not loaded yet. Please refresh the page and try again.");
  }
  return window.puter;
}

function extractText(result: Awaited<ReturnType<PuterGlobal["ai"]["chat"]>>): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object" && "message" in result) {
    return result.message?.content || "";
  }
  return "";
}

/**
 * Generates text via Puter.js, trying `model` (or the first entry of
 * PUTER_MODEL_FALLBACK_CHAIN) and falling back to the next model in the
 * chain once on failure.
 */
export async function generateContent(prompt: string, options: { model?: string } = {}): Promise<string> {
  const chain = options.model ? [options.model] : PUTER_MODEL_FALLBACK_CHAIN;

  let lastError: unknown;
  for (let i = 0; i < chain.length; i++) {
    try {
      const puter = getPuter();
      const result = await puter.ai.chat(prompt, { model: chain[i] });
      const text = extractText(result);
      if (!text) throw new Error("No content returned from the AI model.");
      return text;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("AI generation failed. Please try again.");
}

/**
 * Streaming variant: iterates Puter.js chunks and reports incremental text
 * via `onChunk`. Falls back to the next model in the chain once on failure,
 * restarting accumulation (callers should reset any partial UI state in
 * `onChunk` when they see an empty string, or simply re-render from scratch
 * on the first chunk of a retry).
 */
export async function generateContentStreaming(
  prompt: string,
  onChunk: (textSoFar: string) => void,
  options: { model?: string } = {}
): Promise<string> {
  const chain = options.model ? [options.model] : PUTER_MODEL_FALLBACK_CHAIN;

  let lastError: unknown;
  for (let i = 0; i < chain.length; i++) {
    try {
      const puter = getPuter();
      const result = await puter.ai.chat(prompt, { model: chain[i], stream: true });
      let full = "";

      if (result && typeof result === "object" && Symbol.asyncIterator in result) {
        for await (const chunk of result as AsyncIterable<PuterChatChunk>) {
          if (chunk?.text) {
            full += chunk.text;
            onChunk(full);
          }
        }
      } else {
        full = extractText(result);
        onChunk(full);
      }

      if (!full) throw new Error("No content returned from the AI model.");
      return full;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("AI generation failed. Please try again.");
}
