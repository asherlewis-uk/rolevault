import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ROLEVAULT_INFERENCE_URL = "https://api.asherlewis.online";
const DEFAULT_MODEL = "google/gemini-3-flash-preview";

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
  model?: string;
  stream?: boolean;
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: ChatRequest = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const systemPrompt = typeof body.systemPrompt === "string" ? body.systemPrompt : "";

    const upstream = await fetch(`${ROLEVAULT_INFERENCE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: body.model || DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: body.stream ?? true,
      }),
    });

    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => "");
      return jsonError(`Inference service error (${upstream.status}): ${errorText.slice(0, 200)}`, 502);
    }

    if (!upstream.body || body.stream === false) {
      const data = await upstream.text();
      return new Response(data, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (err) {
    console.error("chat edge function error:", err);
    return jsonError(err instanceof Error ? err.message : "Internal server error", 500);
  }
});
