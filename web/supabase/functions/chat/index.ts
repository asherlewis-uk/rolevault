import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt: string;
  provider: string; // "lovable-ai" | "openai" | "anthropic" | "google" | "custom"
  model: string;
  apiKey?: string;  // user-supplied key for cloud providers
  baseUrl?: string; // for custom/docker endpoints
  stream?: boolean;
}

function buildSystemPrompt(systemPrompt: string): ChatMessage {
  return { role: "system", content: systemPrompt };
}

// ── Lovable AI Gateway (OpenAI-compatible) ─────────────────────────────────
async function callLovableAI(
  messages: ChatMessage[],
  model: string,
  stream: boolean,
): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "google/gemini-3-flash-preview",
      messages,
      stream,
    }),
  });
  return resp;
}

// ── OpenAI API ─────────────────────────────────────────────────────────────
async function callOpenAI(
  messages: ChatMessage[],
  model: string,
  apiKey: string,
  stream: boolean,
): Promise<Response> {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages,
      stream,
    }),
  });
  return resp;
}

// ── Anthropic API ──────────────────────────────────────────────────────────
async function callAnthropic(
  messages: ChatMessage[],
  model: string,
  apiKey: string,
  stream: boolean,
): Promise<Response> {
  // Separate system from conversation messages
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const conv = messages.filter((m) => m.role !== "system");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "claude-3-haiku-20240307",
      max_tokens: 1024,
      system,
      messages: conv.map((m) => ({ role: m.role, content: m.content })),
      stream,
    }),
  });
  return resp;
}

// ── Google Gemini (via generativelanguage API) ─────────────────────────────
async function callGoogle(
  messages: ChatMessage[],
  model: string,
  apiKey: string,
  stream: boolean,
): Promise<Response> {
  const geminiModel = model || "gemini-1.5-flash";
  const endpoint = stream
    ? `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?key=${apiKey}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

  const systemMsg = messages.find((m) => m.role === "system");
  const conv = messages.filter((m) => m.role !== "system");

  const body: Record<string, unknown> = {
    contents: conv.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    })),
  };
  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return resp;
}

// ── Custom / Docker / OpenAI-compatible endpoint ───────────────────────────
async function callCustom(
  messages: ChatMessage[],
  model: string,
  baseUrl: string,
  apiKey: string,
  stream: boolean,
): Promise<Response> {
  const url = baseUrl.replace(/\/$/, "") + "/v1/chat/completions";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages, stream }),
  });
  return resp;
}

// ── Anthropic SSE → OpenAI SSE normaliser ─────────────────────────────────
// Anthropic uses different event names; we normalise to the openai delta format
// so the frontend only needs one parser.
function anthropicToOpenAIStream(anthropicStream: ReadableStream): ReadableStream {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const reader = anthropicStream.getReader();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trimEnd();
          buffer = buffer.slice(nl + 1);
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") { controller.enqueue(encoder.encode("data: [DONE]\n\n")); break; }
          try {
            const ev = JSON.parse(raw);
            if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
              const openaiChunk = {
                choices: [{ delta: { content: ev.delta.text }, finish_reason: null }],
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
            } else if (ev.type === "message_stop") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            }
          } catch { /* skip */ }
        }
      }
      controller.close();
    },
  });
}

// ── Google SSE → OpenAI SSE normaliser ────────────────────────────────────
function googleToOpenAIStream(googleStream: ReadableStream): ReadableStream {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const reader = googleStream.getReader();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        // Google streams JSON array items separated by commas
        // Try to extract complete JSON objects
        const matches = buffer.matchAll(/\{[^{}]*"text"\s*:\s*"([^"\\]|\\.)*"[^{}]*\}/g);
        for (const match of matches) {
          try {
            const obj = JSON.parse(match[0]);
            const text = obj?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const chunk = { choices: [{ delta: { content: text }, finish_reason: null }] };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            }
          } catch { /* skip */ }
        }
        // Keep only the last partial segment
        const lastBrace = buffer.lastIndexOf("{");
        if (lastBrace > 0) buffer = buffer.slice(lastBrace);
      }
      controller.close();
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: ChatRequest = await req.json();
    const { messages, systemPrompt, provider = "lovable-ai", model, apiKey = "", baseUrl = "", stream = true } = body;

    const fullMessages: ChatMessage[] = [buildSystemPrompt(systemPrompt), ...messages];

    let upstream: Response;

    switch (provider) {
      case "lovable-ai":
        upstream = await callLovableAI(fullMessages, model, stream);
        break;

      case "openai": {
        const key = apiKey || Deno.env.get("OPENAI_API_KEY") || "";
        if (!key) return jsonError("OpenAI API key is required. Add it in AI Provider settings.", 400);
        upstream = await callOpenAI(fullMessages, model, key, stream);
        break;
      }

      case "anthropic": {
        const key = apiKey || Deno.env.get("ANTHROPIC_API_KEY") || "";
        if (!key) return jsonError("Anthropic API key is required. Add it in AI Provider settings.", 400);
        upstream = await callAnthropic(fullMessages, model, key, stream);
        break;
      }

      case "google": {
        const key = apiKey || Deno.env.get("GOOGLE_API_KEY") || "";
        if (!key) return jsonError("Google AI API key is required. Add it in AI Provider settings.", 400);
        upstream = await callGoogle(fullMessages, model, key, stream);
        break;
      }

      case "custom":
      case "docker":
      case "ollama-remote": {
        if (!baseUrl) return jsonError("Base URL is required for custom/Docker providers.", 400);
        upstream = await callCustom(fullMessages, model, baseUrl, apiKey, stream);
        break;
      }

      default:
        return jsonError(`Unknown provider: ${provider}`, 400);
    }

    // ── Handle upstream errors ─────────────────────────────────────────────
    if (!upstream.ok) {
      if (upstream.status === 429) {
        return jsonError("Rate limit exceeded — please wait a moment and try again.", 429);
      }
      if (upstream.status === 402) {
        return jsonError("Payment required — please add credits to your workspace.", 402);
      }
      const errorText = await upstream.text();
      console.error(`Upstream [${provider}] error ${upstream.status}:`, errorText);
      return jsonError(`AI provider error (${upstream.status}): ${errorText.slice(0, 200)}`, 502);
    }

    // ── Stream passthrough or normalise ───────────────────────────────────
    if (!stream || !upstream.body) {
      const data = await upstream.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let outputStream: ReadableStream = upstream.body;
    if (provider === "anthropic") outputStream = anthropicToOpenAIStream(upstream.body);
    else if (provider === "google") outputStream = googleToOpenAIStream(upstream.body);

    return new Response(outputStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });

  } catch (err) {
    console.error("chat edge function error:", err);
    return jsonError(err instanceof Error ? err.message : "Internal server error", 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
