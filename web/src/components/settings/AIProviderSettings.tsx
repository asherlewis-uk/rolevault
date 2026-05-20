import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu, ChevronDown, ChevronRight, RefreshCw, CheckCircle2,
  XCircle, Loader2, Eye, EyeOff, Wifi, WifiOff, AlertCircle,
} from "lucide-react";
import {
  useLLMProvider,
  PROVIDERS,
  type ProviderID,
  type ModelOption,
} from "@/hooks/useLLMProvider";

// ── tiny subcomponents ────────────────────────────────────────────────────────

function ProviderPill({
  meta,
  selected,
  onClick,
}: {
  meta: typeof PROVIDERS[0];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl w-full text-left transition-all duration-200"
      style={{
        background: selected ? `hsl(var(${meta.accent}) / 0.1)` : "hsl(var(--accent) / 0.4)",
        border: `1px solid ${selected ? `hsl(var(${meta.accent}) / 0.4)` : "hsl(var(--border) / 0.35)"}`,
        boxShadow: selected ? `0 0 14px hsl(var(${meta.accent}) / 0.15)` : "none",
      }}
    >
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{
          background: selected ? `hsl(var(${meta.accent}))` : "hsl(var(--muted-foreground) / 0.3)",
          boxShadow: selected ? `0 0 6px hsl(var(${meta.accent}) / 0.6)` : "none",
        }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-display font-semibold text-foreground leading-none">{meta.label}</p>
        <p className="text-[10px] text-muted-foreground/55 mt-0.5 truncate">{meta.description}</p>
      </div>
      {meta.isLocal && (
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{
            background: "hsl(var(--spectral-green) / 0.12)",
            color: "hsl(var(--spectral-green))",
            border: "1px solid hsl(var(--spectral-green) / 0.25)",
          }}
        >
          LOCAL
        </span>
      )}
      {selected && <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: `hsl(var(${meta.accent}))` }} />}
    </button>
  );
}

function ModelSelect({
  models,
  value,
  onChange,
  discovering,
  onRefresh,
}: {
  models: ModelOption[];
  value: string;
  onChange: (v: string) => void;
  discovering: boolean;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = models.find((m) => m.id === value) ?? { id: value, label: value };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all duration-200"
        style={{
          background: "hsl(var(--background) / 0.5)",
          border: "1px solid hsl(var(--border) / 0.6)",
        }}
      >
        {discovering ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground/60 flex-shrink-0" />
        ) : (
          <Cpu className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
        )}
        <span className="flex-1 text-xs font-medium text-foreground truncate">
          {discovering ? "Discovering models…" : (selected.label || "Select model")}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl overflow-hidden"
            style={{
              background: "hsl(var(--card) / 0.97)",
              border: "1px solid hsl(var(--border) / 0.55)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px hsl(236 22% 2% / 0.55)",
              maxHeight: "220px",
              overflowY: "auto",
            }}
          >
            {/* Refresh row */}
            <button
              onClick={(e) => { e.stopPropagation(); onRefresh(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
              style={{ borderBottom: "1px solid hsl(var(--border) / 0.3)" }}
            >
              <RefreshCw className="w-3 h-3" />
              Refresh / discover models
            </button>
            {models.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground/50 text-center">
                No models found — is your server running?
              </p>
            ) : (
              models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { onChange(m.id); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors"
                  style={{
                    background: value === m.id ? "hsl(var(--primary) / 0.08)" : "transparent",
                    borderBottom: "1px solid hsl(var(--border) / 0.2)",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{m.label}</p>
                    {m.description && (
                      <p className="text-[10px] text-muted-foreground/50 truncate">{m.description}</p>
                    )}
                  </div>
                  {value === m.id && (
                    <div className="w-3 h-3 rounded-full btn-gradient flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function AIProviderSettings() {
  const {
    config,
    setConfig,
    providerMeta,
    availableModels,
    discovering,
    runDiscovery,
    connectionStatus,
    connectionError,
    testConnection,
  } = useLLMProvider();

  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    await testConnection();
    setTesting(false);
  };

  // Reset model when provider changes
  const handleProviderChange = (id: ProviderID) => {
    const meta = PROVIDERS.find((p) => p.id === id)!;
    setConfig({
      provider: id,
      model: meta.defaultModel,
      baseUrl: meta.defaultBaseUrl ?? "",
      apiKey: "",
    });
  };

  return (
    <div className="space-y-4">
      {/* Provider grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {PROVIDERS.map((p) => (
          <ProviderPill
            key={p.id}
            meta={p}
            selected={config.provider === p.id}
            onClick={() => handleProviderChange(p.id)}
          />
        ))}
      </div>

      {/* Configuration card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={config.provider}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl overflow-hidden space-y-0"
          style={{
            background: `hsl(var(${providerMeta.accent}) / 0.04)`,
            border: `1px solid hsl(var(${providerMeta.accent}) / 0.2)`,
          }}
        >
          {/* Model picker */}
          <div className="px-4 py-3" style={{ borderBottom: "1px solid hsl(var(--border) / 0.2)" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">Model</p>
            <ModelSelect
              models={availableModels}
              value={config.model}
              onChange={(m) => setConfig({ model: m })}
              discovering={discovering}
              onRefresh={runDiscovery}
            />
          </div>

          {/* Base URL (ollama / docker / custom) */}
          {(providerMeta.requiresBaseUrl || providerMeta.isLocal) && (
            <div className="px-4 py-3" style={{ borderBottom: "1px solid hsl(var(--border) / 0.2)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
                Base URL
              </p>
              <input
                value={config.baseUrl}
                onChange={(e) => setConfig({ baseUrl: e.target.value })}
                placeholder={providerMeta.defaultBaseUrl ?? "http://localhost:11434"}
                className="w-full rounded-xl px-3 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/35 focus:outline-none transition-colors"
                style={{
                  background: "hsl(var(--background) / 0.5)",
                  border: "1px solid hsl(var(--border) / 0.55)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = `hsl(var(${providerMeta.accent}) / 0.45)`)}
                onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(var(--border) / 0.55)")}
              />
              {providerMeta.isLocal && (
                <p className="text-[10px] text-muted-foreground/45 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  Calls go directly from your browser — not via any server
                </p>
              )}
            </div>
          )}

          {/* API Key (cloud providers) */}
          {providerMeta.requiresApiKey && (
            <div className="px-4 py-3" style={{ borderBottom: "1px solid hsl(var(--border) / 0.2)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
                API Key
              </p>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={config.apiKey}
                  onChange={(e) => setConfig({ apiKey: e.target.value })}
                  placeholder="sk-…"
                  className="w-full rounded-xl px-3 py-2.5 pr-9 text-xs font-mono text-foreground placeholder:text-muted-foreground/35 focus:outline-none transition-colors"
                  style={{
                    background: "hsl(var(--background) / 0.5)",
                    border: "1px solid hsl(var(--border) / 0.55)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = `hsl(var(${providerMeta.accent}) / 0.45)`)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(var(--border) / 0.55)")}
                />
                <button
                  onClick={() => setShowKey((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/45 mt-1.5">
                Stored locally — sent server-side only when needed
              </p>
            </div>
          )}

          {/* Custom API key (optional for docker/custom) */}
          {!providerMeta.requiresApiKey && (config.provider === "docker" || config.provider === "custom") && (
            <div className="px-4 py-3" style={{ borderBottom: "1px solid hsl(var(--border) / 0.2)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
                API Key <span className="normal-case font-normal">(optional)</span>
              </p>
              <input
                type={showKey ? "text" : "password"}
                value={config.apiKey}
                onChange={(e) => setConfig({ apiKey: e.target.value })}
                placeholder="Leave blank if not required"
                className="w-full rounded-xl px-3 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/35 focus:outline-none transition-colors"
                style={{
                  background: "hsl(var(--background) / 0.5)",
                  border: "1px solid hsl(var(--border) / 0.55)",
                }}
              />
            </div>
          )}

          {/* Test + status */}
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex-shrink-0"
              style={{
                background: `hsl(var(${providerMeta.accent}) / 0.12)`,
                border: `1px solid hsl(var(${providerMeta.accent}) / 0.3)`,
                color: `hsl(var(${providerMeta.accent}))`,
                opacity: testing ? 0.6 : 1,
              }}
            >
              {testing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : connectionStatus === "ok" ? (
                <Wifi className="w-3 h-3" />
              ) : connectionStatus === "error" ? (
                <WifiOff className="w-3 h-3" />
              ) : (
                <Wifi className="w-3 h-3" />
              )}
              {testing ? "Testing…" : "Test Connection"}
            </button>

            {connectionStatus === "ok" && (
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "hsl(var(--spectral-green))" }}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected
              </div>
            )}
            {connectionStatus === "error" && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "hsl(var(--spectral-orange))" }}>
                <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate max-w-[160px]" title={connectionError}>{connectionError}</span>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Local info banner */}
      {providerMeta.isLocal && (
        <div
          className="rounded-xl px-4 py-3 text-xs text-muted-foreground/70 leading-relaxed"
          style={{
            background: `hsl(var(${providerMeta.accent}) / 0.06)`,
            border: `1px solid hsl(var(${providerMeta.accent}) / 0.2)`,
          }}
        >
          {config.provider === "ollama" ? (
            <>
              <strong className="text-foreground/80">Ollama</strong> — install from{" "}
              <span className="font-mono text-[10px]">ollama.com</span>, then run{" "}
              <span className="font-mono text-[10px]">ollama pull {config.model || "llama3.2"}</span>.{" "}
              Enable CORS with{" "}
              <span className="font-mono text-[10px]">OLLAMA_ORIGINS=* ollama serve</span>.
            </>
          ) : (
            <>
              <strong className="text-foreground/80">Local API</strong> — any OpenAI-compatible server
              (LM Studio · llama.cpp · Oobabooga · Jan · vLLM · koboldcpp).
              Make sure CORS is enabled for browser access.
            </>
          )}
        </div>
      )}
    </div>
  );
}
