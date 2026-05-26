import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Settings, Moon, Sun, Monitor, Globe, Type, Zap, Sparkles, MessageCircle, ChevronRight } from "lucide-react";
import { containerVariants, itemVariants } from "@/lib/animations";

interface ToggleProps { checked: boolean; onChange: (v: boolean) => void; }
function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-300 focus:outline-none"
      style={{
        background: checked ? "hsl(var(--primary))" : "hsl(var(--muted) / 0.6)",
        boxShadow: checked ? "0 0 12px hsl(var(--primary) / 0.45)" : "none",
        border: "1px solid hsl(var(--border) / 0.5)",
      }}>
      <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-300"
        style={{
          background: checked ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground) / 0.5)",
          transform: checked ? "translateX(20px)" : "translateX(0)",
        }} />
    </button>
  );
}

const themes = [
  { id: "dark", icon: Moon, label: "Dark" },
  { id: "light", icon: Sun, label: "Light" },
  { id: "system", icon: Monitor, label: "System" },
];

const languages = [
  { code: "en", label: "English", native: "English" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "ko", label: "Korean", native: "한국어" },
];

const aiModels = [
  { id: "flash", name: "Flash", desc: "Fastest responses, ideal for quick chats", accent: "--spectral-amber", badge: "Default" },
  { id: "pro", name: "Pro", desc: "Deeper personality, longer memory context", accent: "--spectral-violet", badge: "Voyager+" },
  { id: "ultra", name: "Ultra", desc: "Most immersive, nuanced, emotionally rich", accent: "--primary", badge: "Luminary" },
];

const fontSizes = ["Small", "Medium", "Large"];
const densities = ["Compact", "Comfortable", "Spacious"];

export default function Preferences() {
  const [theme, setTheme] = useState("dark");
  const [lang, setLang] = useState("en");
  const [aiModel, setAiModel] = useState("flash");
  const [fontSize, setFontSize] = useState("Medium");
  const [density, setDensity] = useState("Comfortable");
  const [prefs, setPrefs] = useState({
    haptics: true,
    sounds: false,
    animations: true,
    autoPlay: true,
    streamText: true,
  });
  const toggle = (k: string, v: boolean) => setPrefs((p) => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 mesh-grid opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-72 h-72 opacity-[0.06] blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--spectral-violet)) 0%, transparent 70%)" }} />

      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{
          background: "hsl(var(--card) / 0.72)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid hsl(var(--border) / 0.4)",
        }}>
        <Link to="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-6 h-6 rounded-lg btn-gradient flex items-center justify-center">
            <Settings className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-sm gradient-text">Preferences</span>
        </div>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show"
        className="max-w-xl mx-auto px-4 pt-6 pb-safe-nav lg:pb-10 relative z-10 space-y-5">

        {/* Theme */}
        <motion.div variants={itemVariants}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 mb-2">Appearance</p>
          <div className="panel rounded-2xl p-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Moon className="w-3.5 h-3.5 text-primary" /> Theme
              </p>
              <div className="grid grid-cols-3 gap-2">
                {themes.map(({ id, icon: Icon, label }) => (
                  <button key={id} onClick={() => setTheme(id)}
                    className="flex flex-col items-center gap-2 py-3 rounded-xl transition-all duration-200"
                    style={{
                      background: theme === id ? "hsl(var(--primary) / 0.12)" : "hsl(var(--accent) / 0.4)",
                      border: `1px solid ${theme === id ? "hsl(var(--primary) / 0.4)" : "hsl(var(--border) / 0.4)"}`,
                      boxShadow: theme === id ? "0 0 14px hsl(var(--primary) / 0.2)" : "none",
                    }}>
                    <Icon className="w-4 h-4" style={{ color: theme === id ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
                    <span className="text-xs font-semibold"
                      style={{ color: theme === id ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font size */}
            <div style={{ borderTop: "1px solid hsl(var(--border) / 0.25)", paddingTop: "1rem" }}>
              <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Type className="w-3.5 h-3.5 text-muted-foreground" /> Text Size
              </p>
              <div className="flex gap-2">
                {fontSizes.map((s) => (
                  <button key={s} onClick={() => setFontSize(s)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                    style={{
                      background: fontSize === s ? "hsl(var(--primary))" : "hsl(var(--accent) / 0.5)",
                      color: fontSize === s ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                      border: `1px solid ${fontSize === s ? "hsl(var(--primary) / 0.5)" : "hsl(var(--border) / 0.4)"}`,
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Density */}
            <div style={{ borderTop: "1px solid hsl(var(--border) / 0.25)", paddingTop: "1rem" }}>
              <p className="text-sm font-medium text-foreground mb-3">Chat Density</p>
              <div className="flex gap-2">
                {densities.map((d) => (
                  <button key={d} onClick={() => setDensity(d)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                    style={{
                      background: density === d ? "hsl(var(--primary))" : "hsl(var(--accent) / 0.5)",
                      color: density === d ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                      border: `1px solid ${density === d ? "hsl(var(--primary) / 0.5)" : "hsl(var(--border) / 0.4)"}`,
                    }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Language */}
        <motion.div variants={itemVariants}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 mb-2">Language</p>
          <div className="panel rounded-2xl overflow-hidden" style={{ padding: 0 }}>
            {languages.map((l, i) => (
              <button key={l.code} onClick={() => setLang(l.code)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                style={{ borderBottom: i < languages.length - 1 ? "1px solid hsl(var(--border) / 0.25)" : "none" }}>
                <Globe className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">{l.label}</span>
                  {l.native !== l.label && (
                    <span className="text-xs text-muted-foreground/50 ml-2">{l.native}</span>
                  )}
                </div>
                {lang === l.code && (
                  <div className="w-4 h-4 rounded-full btn-gradient flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* AI Model */}
        <motion.div variants={itemVariants}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 mb-2">AI Model</p>
          <div className="space-y-2">
            {aiModels.map((m) => (
              <button key={m.id} onClick={() => setAiModel(m.id)}
                className="w-full panel rounded-xl p-3.5 text-left transition-all duration-200 flex items-center gap-3"
                style={{
                  borderColor: aiModel === m.id ? `hsl(var(${m.accent}) / 0.4)` : "hsl(var(--border) / 0.4)",
                  background: aiModel === m.id ? `hsl(var(${m.accent}) / 0.08)` : undefined,
                }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `hsl(var(${m.accent}) / 0.15)`, border: `1px solid hsl(var(${m.accent}) / 0.3)` }}>
                  {m.id === "ultra" ? <Sparkles className="w-3.5 h-3.5" style={{ color: `hsl(var(${m.accent}))` }} />
                    : m.id === "pro" ? <Zap className="w-3.5 h-3.5" style={{ color: `hsl(var(${m.accent}))` }} />
                    : <MessageCircle className="w-3.5 h-3.5" style={{ color: `hsl(var(${m.accent}))` }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-sm text-foreground">{m.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: `hsl(var(${m.accent}) / 0.15)`, color: `hsl(var(${m.accent}))`, border: `1px solid hsl(var(${m.accent}) / 0.25)` }}>
                      {m.badge}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">{m.desc}</p>
                </div>
                {aiModel === m.id && (
                  <div className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ background: `hsl(var(${m.accent}))`, boxShadow: `0 0 8px hsl(var(${m.accent}) / 0.5)` }}>
                    <div className="w-full h-full rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Interactions */}
        <motion.div variants={itemVariants}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 mb-2">Interactions</p>
          <div className="panel rounded-2xl overflow-hidden" style={{ padding: 0 }}>
            {[
              { key: "haptics", label: "Haptic Feedback", desc: "Subtle vibration on actions" },
              { key: "sounds", label: "Sound Effects", desc: "Audio cues for messages" },
              { key: "animations", label: "Animations", desc: "Motion and transitions" },
              { key: "autoPlay", label: "Auto-play Voice", desc: "Play character audio automatically" },
              { key: "streamText", label: "Stream Responses", desc: "Show AI typing in real-time" },
            ].map(({ key, label, desc }, i) => (
              <div key={key} className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: i < 4 ? "1px solid hsl(var(--border) / 0.25)" : "none" }}>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{desc}</p>
                </div>
                <Toggle checked={(prefs as Record<string, boolean>)[key]} onChange={(v) => toggle(key, v)} />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Advanced */}
        <motion.div variants={itemVariants}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 mb-2">Advanced</p>
          <div className="panel rounded-2xl overflow-hidden" style={{ padding: 0 }}>
            {[
              { label: "Clear Chat History", desc: "Delete all saved conversations" },
              { label: "Reset Recommendations", desc: "Clear your personalized feed" },
            ].map(({ label, desc }, i) => (
              <button key={label} className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                style={{ borderBottom: i < 1 ? "1px solid hsl(var(--border) / 0.25)" : "none" }}>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{desc}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
              </button>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
