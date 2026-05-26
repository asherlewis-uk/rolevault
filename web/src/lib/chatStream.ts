/**
 * Unified chat streaming utility backed by the managed RoleVault inference API.
 */

import type { ProviderConfig } from "@/hooks/useLLMProvider";
import { ROLEVAULT_INFERENCE_URL } from "@/lib/runtimeConfig";

export interface ChatMsg {
  role: "user" | "assistant" | "system";
  content: string;
}

interface StreamOptions {
  config: ProviderConfig;
  systemPrompt: string;
  messages: ChatMsg[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}

async function consumeOpenAIStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (text: string) => void,
  onDone: () => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;

  while (!finished) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const payload = line.slice(6).trim();
      if (payload === "[DONE]") {
        finished = true;
        break;
      }

      try {
        const parsed = JSON.parse(payload);
        const content: string | undefined = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

  for (const raw of buffer.split("\n")) {
    if (!raw.startsWith("data: ")) continue;
    const payload = raw.slice(6).trim();
    if (payload === "[DONE]") break;
    try {
      const parsed = JSON.parse(payload);
      const content: string | undefined = parsed.choices?.[0]?.delta?.content;
      if (content) onDelta(content);
    } catch {
      // Ignore incomplete stream tail.
    }
  }

  onDone();
}

export async function streamChat(opts: StreamOptions) {
  const { config, systemPrompt, messages, onDelta, onDone, onError } = opts;

  try {
    const response = await fetch(`${ROLEVAULT_INFERENCE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model || "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      let message = `HTTP ${response.status}`;
      try {
        const error = await response.json();
        message = error.error ?? message;
      } catch {
        // Preserve the HTTP status fallback.
      }
      onError(message);
      return;
    }

    await consumeOpenAIStream(response.body, onDelta, onDone);
  } catch (error) {
    onError(error instanceof Error ? error.message : "Network error");
  }
}
