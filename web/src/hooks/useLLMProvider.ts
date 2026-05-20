import { useState, useEffect, useCallback } from "react";

export type ProviderID =
  | "lovable-ai"
  | "openai"
  | "anthropic"
  | "google"
  | "ollama"     // local Ollama (direct browser call)
  | "docker"     // local Docker OpenAI-compatible (direct browser call)
  | "custom";    // remote custom endpoint (routed through edge fn)

export interface ProviderConfig {
  provider: ProviderID;
  model: string;
  apiKey: string;
  baseUrl: string;      // for ollama / docker / custom
}

export interface ModelOption {
  id: string;
  label: string;
  description?: string;
}

export interface ProviderMeta {
  id: ProviderID;
  label: string;
  description: string;
  accent: string;           // CSS var name
  requiresApiKey: boolean;
  requiresBaseUrl: boolean;
  isLocal: boolean;         // calls go direct from browser, not via edge fn
  defaultModel: string;
  staticModels: ModelOption[];
  defaultBaseUrl?: string;
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "lovable-ai",
    label: "Lovable AI",
    description: "Built-in gateway — no API key needed",
    accent: "--primary",
    requiresApiKey: false,
    requiresBaseUrl: false,
    isLocal: false,
    defaultModel: "google/gemini-3-flash-preview",
    staticModels: [
      { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", description: "Fast & capable — default" },
      { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "Balanced cost & quality" },
      { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", description: "Top-tier reasoning" },
      { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview", description: "Next-gen reasoning preview" },
      { id: "openai/gpt-5", label: "GPT-5", description: "OpenAI's flagship model" },
      { id: "openai/gpt-5-mini", label: "GPT-5 Mini", description: "Fast & affordable GPT-5" },
      { id: "openai/gpt-5.2", label: "GPT-5.2", description: "Enhanced reasoning" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    description: "GPT-4o, GPT-4o mini, o1, o3",
    accent: "--spectral-green",
    requiresApiKey: true,
    requiresBaseUrl: false,
    isLocal: false,
    defaultModel: "gpt-4o-mini",
    staticModels: [
      { id: "gpt-4o", label: "GPT-4o", description: "Most capable multimodal" },
      { id: "gpt-4o-mini", label: "GPT-4o Mini", description: "Fast & cheap" },
      { id: "o1", label: "o1", description: "Advanced reasoning" },
      { id: "o1-mini", label: "o1 Mini", description: "Efficient reasoning" },
      { id: "o3", label: "o3", description: "Frontier reasoning model" },
      { id: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", description: "Legacy, ultra-cheap" },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic",
    description: "Claude 3.5 Sonnet, Haiku, Opus",
    accent: "--spectral-orange",
    requiresApiKey: true,
    requiresBaseUrl: false,
    isLocal: false,
    defaultModel: "claude-3-haiku-20240307",
    staticModels: [
      { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", description: "Best balance of intelligence and speed" },
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", description: "Fastest Claude model" },
      { id: "claude-3-opus-20240229", label: "Claude 3 Opus", description: "Most powerful Claude" },
      { id: "claude-3-haiku-20240307", label: "Claude 3 Haiku", description: "Compact & fast" },
    ],
  },
  {
    id: "google",
    label: "Google AI",
    description: "Gemini Pro, Flash, Ultra via direct API",
    accent: "--spectral-cyan",
    requiresApiKey: true,
    requiresBaseUrl: false,
    isLocal: false,
    defaultModel: "gemini-1.5-flash",
    staticModels: [
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", description: "Best capability" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", description: "Fast & cheap" },
      { id: "gemini-1.5-flash-8b", label: "Gemini 1.5 Flash 8B", description: "Smallest & fastest" },
      { id: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash Exp", description: "Next-gen preview" },
    ],
  },
  {
    id: "ollama",
    label: "Ollama",
    description: "Local models — discovers running instance",
    accent: "--spectral-violet",
    requiresApiKey: false,
    requiresBaseUrl: false,
    isLocal: true,
    defaultModel: "llama3.2",
    defaultBaseUrl: "http://localhost:11434",
    staticModels: [
      { id: "llama3.2", label: "Llama 3.2", description: "Meta's latest open model" },
      { id: "llama3.1:8b", label: "Llama 3.1 8B", description: "Fast & capable" },
      { id: "mistral", label: "Mistral 7B", description: "European open-source" },
      { id: "codellama", label: "Code Llama", description: "Coding specialist" },
      { id: "phi3", label: "Phi-3 Mini", description: "Microsoft compact model" },
      { id: "gemma2", label: "Gemma 2", description: "Google open model" },
      { id: "qwen2.5", label: "Qwen 2.5", description: "Alibaba multilingual" },
      { id: "deepseek-r1", label: "DeepSeek R1", description: "Reasoning specialist" },
    ],
  },
  {
    id: "docker",
    label: "Docker / Local API",
    description: "OpenAI-compatible local container",
    accent: "--spectral-pink",
    requiresApiKey: false,
    requiresBaseUrl: true,
    isLocal: true,
    defaultModel: "local-model",
    defaultBaseUrl: "http://localhost:8080",
    staticModels: [
      { id: "local-model", label: "Default Model", description: "Whatever is loaded" },
      { id: "llama.cpp", label: "llama.cpp server", description: "Direct llama.cpp" },
      { id: "lm-studio", label: "LM Studio", description: "Port 1234" },
      { id: "text-generation-webui", label: "Oobabooga WebUI", description: "Port 5000" },
      { id: "jan", label: "Jan", description: "Jan.ai local server" },
    ],
  },
  {
    id: "custom",
    label: "Custom Endpoint",
    description: "Any OpenAI-compatible remote API",
    accent: "--spectral-amber",
    requiresApiKey: false,
    requiresBaseUrl: true,
    isLocal: false,
    defaultModel: "",
    staticModels: [],
  },
];

const STORAGE_KEY = "rolevault_llm_provider";

const DEFAULT_CONFIG: ProviderConfig = {
  provider: "lovable-ai",
  model: "google/gemini-3-flash-preview",
  apiKey: "",
  baseUrl: "",
};

// ── Ollama discovery ─────────────────────────────────────────────────────────
export async function discoverOllamaModels(baseUrl = "http://localhost:11434"): Promise<ModelOption[]> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models ?? []).map((m: { name: string; size: number }) => ({
      id: m.name,
      label: m.name,
      description: m.size ? `${(m.size / 1e9).toFixed(1)} GB` : undefined,
    }));
  } catch {
    return [];
  }
}

// ── Docker/custom model discovery ────────────────────────────────────────────
export async function discoverCustomModels(baseUrl: string, apiKey?: string): Promise<ModelOption[]> {
  try {
    const url = `${baseUrl.replace(/\/$/, "")}/v1/models`;
    const headers: Record<string, string> = {};
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? []).map((m: { id: string }) => ({
      id: m.id,
      label: m.id,
    }));
  } catch {
    return [];
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useLLMProvider() {
  const [config, setConfigState] = useState<ProviderConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [discoveredModels, setDiscoveredModels] = useState<ModelOption[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "ok" | "error">("idle");
  const [connectionError, setConnectionError] = useState("");

  const setConfig = useCallback((updates: Partial<ProviderConfig>) => {
    setConfigState((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setConnectionStatus("idle");
  }, []);

  const providerMeta = PROVIDERS.find((p) => p.id === config.provider) ?? PROVIDERS[0];

  // Auto-discover when provider changes to ollama/docker
  useEffect(() => {
    if (config.provider === "ollama" || config.provider === "docker") {
      runDiscovery();
    }
  }, [config.provider, config.baseUrl]); // eslint-disable-line

  const runDiscovery = useCallback(async () => {
    setDiscovering(true);
    setDiscoveredModels([]);
    const base =
      config.baseUrl ||
      providerMeta.defaultBaseUrl ||
      (config.provider === "ollama" ? "http://localhost:11434" : "http://localhost:8080");

    let models: ModelOption[] = [];
    if (config.provider === "ollama") {
      models = await discoverOllamaModels(base);
    } else if (config.provider === "docker" || config.provider === "custom") {
      models = await discoverCustomModels(base, config.apiKey);
    }
    setDiscoveredModels(models);
    setDiscovering(false);
  }, [config.provider, config.baseUrl, config.apiKey, providerMeta.defaultBaseUrl]);

  // Test connection
  const testConnection = useCallback(async (): Promise<boolean> => {
    setConnectionStatus("idle");
    setConnectionError("");

    try {
      if (config.provider === "ollama" || config.provider === "docker") {
        const base =
          config.baseUrl ||
          providerMeta.defaultBaseUrl ||
          "http://localhost:11434";
        const url =
          config.provider === "ollama"
            ? `${base}/api/tags`
            : `${base}/v1/models`;
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await res.text();
        setConnectionStatus("ok");
        await runDiscovery();
        return true;
      }

      // For cloud providers, send a minimal test request via inference API
      const INFERENCE_URL = import.meta.env.VITE_INFERENCE_URL || "https://api.asherlewis.online";
      const res = await fetch(`${INFERENCE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: "You are a test assistant. Reply with only: OK" },
            { role: "user", content: "ping" },
          ],
          stream: false,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      setConnectionStatus("ok");
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection failed";
      setConnectionStatus("error");
      setConnectionError(msg);
      return false;
    }
  }, [config, providerMeta.defaultBaseUrl, runDiscovery]);

  const availableModels: ModelOption[] =
    discoveredModels.length > 0 ? discoveredModels : providerMeta.staticModels;

  return {
    config,
    setConfig,
    providerMeta,
    availableModels,
    discovering,
    runDiscovery,
    connectionStatus,
    connectionError,
    testConnection,
    PROVIDERS,
  };
}
