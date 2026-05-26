import { useCallback, useEffect, useState } from "react";
import { ROLEVAULT_INFERENCE_URL } from "@/lib/runtimeConfig";

export type ProviderID = "rolevault";

export interface ProviderConfig {
  provider: ProviderID;
  model: string;
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
  accent: string;
  defaultModel: string;
  staticModels: ModelOption[];
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "rolevault",
    label: "RoleVault AI",
    description: "Managed RoleVault inference",
    accent: "--primary",
    defaultModel: "google/gemini-3-flash-preview",
    staticModels: [
      { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", description: "Fast and capable default" },
      { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "Balanced speed and quality" },
      { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", description: "Higher-depth reasoning" },
      { id: "openai/gpt-5-mini", label: "GPT-5 Mini", description: "Fast GPT-5 class model" },
      { id: "openai/gpt-5", label: "GPT-5", description: "Frontier OpenAI model" },
    ],
  },
];

const MODEL_STORAGE_KEY = "rolevault_model";
const LEGACY_PROVIDER_STORAGE_KEY = "rolevault_llm_provider";
const providerMeta = PROVIDERS[0];

const DEFAULT_CONFIG: ProviderConfig = {
  provider: "rolevault",
  model: providerMeta.defaultModel,
};

function storedModel() {
  try {
    localStorage.removeItem(LEGACY_PROVIDER_STORAGE_KEY);
    return localStorage.getItem(MODEL_STORAGE_KEY) || DEFAULT_CONFIG.model;
  } catch {
    return DEFAULT_CONFIG.model;
  }
}

async function discoverManagedModels(): Promise<ModelOption[]> {
  try {
    const response = await fetch(`${ROLEVAULT_INFERENCE_URL}/v1/models`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return [];

    const data = await response.json();
    return (data.data ?? []).map((model: { id: string }) => ({
      id: model.id,
      label: model.id,
    }));
  } catch {
    return [];
  }
}

export function useLLMProvider() {
  const [model, setModel] = useState(storedModel);
  const [discoveredModels, setDiscoveredModels] = useState<ModelOption[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "ok" | "error">("idle");
  const [connectionError, setConnectionError] = useState("");

  const setConfig = useCallback((updates: Partial<ProviderConfig>) => {
    if (!updates.model) return;

    setModel(updates.model);
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, updates.model);
      localStorage.removeItem(LEGACY_PROVIDER_STORAGE_KEY);
    } catch {
      // Local storage is optional; runtime endpoints remain hardcoded either way.
    }
    setConnectionStatus("idle");
  }, []);

  const runDiscovery = useCallback(async () => {
    setDiscovering(true);
    const models = await discoverManagedModels();
    setDiscoveredModels(models);
    setDiscovering(false);
  }, []);

  useEffect(() => {
    runDiscovery();
  }, [runDiscovery]);

  const testConnection = useCallback(async (): Promise<boolean> => {
    setConnectionStatus("idle");
    setConnectionError("");

    try {
      const response = await fetch(`${ROLEVAULT_INFERENCE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are a test assistant. Reply with only: OK" },
            { role: "user", content: "ping" },
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(error.error ?? `HTTP ${response.status}`);
      }

      setConnectionStatus("ok");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection failed";
      setConnectionStatus("error");
      setConnectionError(message);
      return false;
    }
  }, [model]);

  const availableModels = discoveredModels.length > 0 ? discoveredModels : providerMeta.staticModels;
  const activeModel = availableModels.some((option) => option.id === model) ? model : providerMeta.defaultModel;

  return {
    config: { provider: "rolevault" as const, model: activeModel },
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
