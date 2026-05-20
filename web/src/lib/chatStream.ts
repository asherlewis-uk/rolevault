/**
 * Unified chat streaming utility.
 *
 * - Cloud providers (lovable-ai, openai, anthropic, google, custom) →
 *   routed through the RoleVault inference API directly.
 *
 * - Local providers (ollama, docker) →
 *   called directly from the browser since they run on localhost and
 *   cannot be reached by the edge function.
 */

import type { ProviderConfig } from "@/hooks/useLLMProvider";

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

// ── SSE line-by-line parser (OpenAI format) ──────────────────────────────────
async function consumeOpenAIStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (t: string) => void,
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

    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const payload = line.slice(6).trim();
      if (payload === "[DONE]") { finished = true; break; }

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

  // Flush remaining
  for (const raw of buffer.split("\n")) {
    if (!raw.startsWith("data: ")) continue;
    const payload = raw.slice(6).trim();
    if (payload === "[DONE]") break;
    try {
      const p = JSON.parse(payload);
      const c: string | undefined = p.choices?.[0]?.delta?.content;
      if (c) onDelta(c);
    } catch { /* ignore */ }
  }

  onDone();
}

// ── Local Ollama / Docker call (direct from browser) ──────────────────────────
async function streamLocal(opts: StreamOptions) {
  const { config, systemPrompt, messages, onDelta, onDone, onError } = opts;
  const base =
    config.baseUrl ||
    (config.provider === "ollama" ? "http://localhost:11434" : "http://localhost:8080");

  const allMessages: ChatMsg[] = [{ role: "system", content: systemPrompt }, ...messages];

  try {
    let url: string;
    let body: string;

    if (config.provider === "ollama") {
      // Ollama native /api/chat endpoint
      url = `${base}/api/chat`;
      body = JSON.stringify({
        model: config.model || "llama3.2",
        messages: allMessages,
        stream: true,
      });
    } else {
      // Docker / LM Studio / Oobabooga — OpenAI-compatible
      url = `${base}/v1/chat/completions`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`;
      body = JSON.stringify({
        model: config.model || "local-model",
        messages: allMessages,
        stream: true,
      });
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!res.ok || !res.body) {
      const txt = await res.text().catch(() => `HTTP ${res.status}`);
      onError(txt);
      return;
    }

    if (config.provider === "ollama") {
      // Ollama streams newline-delimited JSON (NDJSON), not SSE
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let leftover = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        leftover += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = leftover.indexOf("\n")) !== -1) {
          const line = leftover.slice(0, nl).trim();
          leftover = leftover.slice(nl + 1);
          if (!line) continue;
          try {
            const obj = JSON.parse(line);
            const text: string | undefined = obj.message?.content;
            if (text) onDelta(text);
            if (obj.done) { onDone(); return; }
          } catch { /* skip */ }
        }
      }
      onDone();
    } else {
      // OpenAI SSE
      await consumeOpenAIStream(res.body, onDelta, onDone);
    }
  } catch (e) {
    onError(
      e instanceof TypeError && e.message.includes("Failed to fetch")
        ? `Cannot reach ${base} — is your local server running?`
        : (e instanceof Error ? e.message : "Unknown error"),
    );
  }
}

// ── Cloud call via inference API ───────────────────────────────────────────────
async function streamCloud(opts: StreamOptions) {
  const { config, systemPrompt, messages, onDelta, onDone, onError } = opts;
  const INFERENCE_URL = import.meta.env.VITE_INFERENCE_URL || "https://api.asherlewis.online";

  try {
    const res = await fetch(`${INFERENCE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model || "local-model",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      let msg = `HTTP ${res.status}`;
      try { const j = await res.json(); msg = j.error ?? msg; } catch { /* */ }
      onError(msg);
      return;
    }

    await consumeOpenAIStream(res.body, onDelta, onDone);
  } catch (e) {
    onError(e instanceof Error ? e.message : "Network error");
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────
export async function streamChat(opts: StreamOptions) {
  const isLocal = opts.config.provider === "ollama" || opts.config.provider === "docker";
  if (isLocal) {
    await streamLocal(opts);
  } else {
    await streamCloud(opts);
  }
}
