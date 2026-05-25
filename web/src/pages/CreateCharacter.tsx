import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Upload, ChevronRight, ChevronLeft,
  Sparkles, Wand2, Shield, Globe, Lock, ArrowLeft, Check
} from "lucide-react";
import charLyra from "@/assets/char-lyra.jpg";
import { useInputFocus } from "@/hooks/useInputFocus";

const STEPS = ["Identity", "Personality", "Scenario", "Settings", "Preview"];

export default function CreateCharacter() {
  const inputF = useInputFocus({ borderFocus: "hsl(var(--primary) / 0.5)", borderBlur: "hsl(var(--border) / 0.7)" });

export default function CreateCharacter() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", tagline: "", personality: "", scenario: "",
    greeting: "", sampleQ: "", sampleA: "",
    visibility: "public", rating: "G", avatar: null as string | null,
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const stepContent: Record<number, JSX.Element> = {
    0: (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground mb-1">Character Identity</h2>
          <p className="text-sm text-muted-foreground">Start with a name and avatar that captures who they are.</p>
        </div>

        {/* Avatar upload */}
        <div className="flex items-center gap-5">
          <div
            className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center cursor-pointer transition-all duration-200 relative group flex-shrink-0"
            style={{
              background: "hsl(var(--background) / 0.6)",
              border: "2px dashed hsl(var(--border) / 0.6)",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary) / 0.5)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = form.avatar ? "hsl(var(--primary) / 0.4)" : "hsl(var(--border) / 0.6)"}
          >
            {form.avatar ? (
              <img src={form.avatar} alt={form.name || "Character avatar"} className="w-full h-full object-cover" />
            ) : (
              <Upload className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-0.5">Character Avatar</p>
            <p className="text-xs text-muted-foreground mb-3">JPG, PNG · Max 5MB</p>
            <div className="flex gap-2">
              <button className="text-xs px-3 py-1.5 rounded-lg text-muted-foreground transition-all duration-200"
                style={{ background: "hsl(var(--accent) / 0.7)", border: "1px solid hsl(var(--border) / 0.7)" }}>
                Upload
              </button>
              <button
                onClick={() => set("avatar", charLyra)}
                className="text-xs px-3 py-1.5 rounded-lg text-primary flex items-center gap-1 transition-all duration-200"
                style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.3)" }}>
                <Wand2 className="w-3 h-3" /> Generate
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Character Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="e.g. Lyra, Rex Noir, The Sage…"
              className={inputCls} style={{ ...inputStyle }}
              onFocus={inputFocus} onBlur={inputBlur} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tagline</label>
            <input value={form.tagline} onChange={e => set("tagline", e.target.value)}
              placeholder="A one-line description…"
              className={inputCls} style={{ ...inputStyle }}
              onFocus={inputFocus} onBlur={inputBlur} />
            <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-right">{form.tagline.length}/120</p>
          </div>
        </div>
      </div>
    ),
    1: (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground mb-1">Personality</h2>
          <p className="text-sm text-muted-foreground">How does your character think, speak, and behave?</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Personality Description *</label>
          <textarea value={form.personality} onChange={e => set("personality", e.target.value)}
            placeholder="Describe personality, speaking style, mannerisms, values, quirks…"
            rows={6} className={`${inputCls} resize-none`} style={{ ...inputStyle }}
            onFocus={inputFocus} onBlur={inputBlur} />
          <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-right">{form.personality.length}/2000</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "hsl(var(--secondary) / 0.07)", border: "1px solid hsl(var(--secondary) / 0.2)" }}>
          <div className="flex items-center gap-2 mb-2.5">
            <Wand2 className="w-3.5 h-3.5 text-secondary" />
            <p className="text-xs font-semibold text-secondary">Writing Tips</p>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Use first or third person consistently</li>
            <li>Include how they react to different emotions</li>
            <li>Describe verbal tics and catchphrases</li>
            <li>Note what they care deeply about</li>
          </ul>
        </div>
      </div>
    ),
    2: (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground mb-1">Set the Stage</h2>
          <p className="text-sm text-muted-foreground">Define the world and opening moment of your character.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">World / Scenario</label>
          <textarea value={form.scenario} onChange={e => set("scenario", e.target.value)}
            placeholder="Describe the setting or world this character exists in…"
            rows={4} className={`${inputCls} resize-none`} style={{ ...inputStyle }}
            onFocus={inputFocus} onBlur={inputBlur} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Opening Greeting *</label>
          <textarea value={form.greeting} onChange={e => set("greeting", e.target.value)}
            placeholder="The first message your character sends in a new chat…"
            rows={3} className={`${inputCls} resize-none`} style={{ ...inputStyle }}
            onFocus={inputFocus} onBlur={inputBlur} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sample User Message</label>
            <textarea value={form.sampleQ} onChange={e => set("sampleQ", e.target.value)}
              placeholder="A question a user might ask…"
              rows={3} className={`${inputCls} resize-none`} style={{ ...inputStyle }}
              onFocus={inputFocus} onBlur={inputBlur} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Character's Reply</label>
            <textarea value={form.sampleA} onChange={e => set("sampleA", e.target.value)}
              placeholder="How your character would respond…"
              rows={3} className={`${inputCls} resize-none`} style={{ ...inputStyle }}
              onFocus={inputFocus} onBlur={inputBlur} />
          </div>
        </div>
      </div>
    ),
    3: (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground mb-1">Privacy & Safety</h2>
          <p className="text-sm text-muted-foreground">Control who can find and interact with your character.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Visibility</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "public", icon: Globe, label: "Public", desc: "Anyone can discover and chat" },
              { id: "unlisted", icon: Lock, label: "Unlisted", desc: "Only people with a link" },
            ].map(({ id, icon: Icon, label, desc }) => (
              <button key={id} onClick={() => set("visibility", id)}
                className="flex items-start gap-3 p-4 rounded-xl text-left transition-all duration-200"
                style={{
                  border: `1px solid ${form.visibility === id ? "hsl(var(--primary) / 0.5)" : "hsl(var(--border) / 0.6)"}`,
                  background: form.visibility === id ? "hsl(var(--primary) / 0.08)" : "hsl(var(--accent) / 0.4)",
                }}>
                <Icon className={`w-4 h-4 mt-0.5 ${form.visibility === id ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className={`text-xs font-semibold ${form.visibility === id ? "text-primary" : "text-foreground"}`}>{label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Content Rating</label>
          <div className="grid grid-cols-4 gap-2">
            {(["G", "PG", "PG-13", "R"] as const).map((r) => (
              <button key={r} onClick={() => set("rating", r)}
                className="py-2.5 rounded-xl text-sm font-display font-bold transition-all duration-200"
                style={{
                  border: `1px solid ${form.rating === r ? "hsl(var(--primary) / 0.5)" : "hsl(var(--border) / 0.6)"}`,
                  background: form.rating === r ? "hsl(var(--primary) / 0.12)" : "hsl(var(--accent) / 0.4)",
                  color: form.rating === r ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                }}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="panel rounded-xl p-4 flex items-start gap-3" style={{ borderColor: "hsl(var(--secondary) / 0.15)" }}>
          <div className="w-8 h-8 rounded-lg icon-box-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground mb-1">Community Guidelines</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              All characters must comply with RoleVault's safety policies. Be creative and expressive — but keep it safe.
            </p>
          </div>
        </div>
      </div>
    ),
    4: (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground mb-1">Preview</h2>
          <p className="text-sm text-muted-foreground">Here's how your character will appear to users.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {/* Card preview */}
          <div>
            <p className="section-label mb-3">Character Card</p>
            <div className="rounded-xl overflow-hidden panel">
              <div className="relative" style={{ aspectRatio: "3/4" }}>
                {form.avatar ? (
                  <img src={form.avatar} alt={form.name || "Character avatar"} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"
                    style={{ background: "var(--gradient-hero)" }}>
                    <Sparkles className="w-12 h-12 text-primary/20" />
                  </div>
                )}
                <div className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, hsl(var(--background) / 0.9), transparent 50%)" }} />
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="font-display font-bold text-foreground text-sm">{form.name || "Character Name"}</h3>
                  <p className="text-muted-foreground text-xs truncate">{form.tagline || "Your tagline"}</p>
                </div>
              </div>
            </div>
          </div>
          {/* Chat preview */}
          <div>
            <p className="section-label mb-3">Greeting Preview</p>
            <div className="panel rounded-xl p-4 space-y-3">
              {form.avatar && (
                <img src={form.avatar} alt="Character preview" className="w-9 h-9 rounded-full object-cover"
                  style={{ boxShadow: "0 0 0 1.5px hsl(var(--secondary) / 0.3)" }} />
              )}
              <div className="bubble-ai rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-foreground leading-relaxed">
                {form.greeting || "Your opening greeting will appear here…"}
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate("/discover")}
          className="w-full btn-gradient rounded-xl py-3.5 font-display font-bold text-primary-foreground flex items-center justify-center gap-2 text-sm"
        >
          <Check className="w-4 h-4" />
          Publish Character
        </button>
      </div>
    ),
  };

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 mesh-grid opacity-30 pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-radial-violet opacity-15 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{
          background: "hsl(var(--card) / 0.72)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid hsl(var(--border) / 0.4)",
        }}>
        <Link to="/discover" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-6 h-6 rounded-lg btn-gradient flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-sm gradient-text">Create Character</span>
        </div>
        <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">Save Draft</button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 pb-safe-nav lg:pb-10 relative z-10">
        {/* Step indicator */}
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => i <= step && setStep(i)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                  style={{
                    background: i < step
                      ? "hsl(var(--primary))"
                      : i === step
                      ? "hsl(var(--primary) / 0.15)"
                      : "hsl(var(--muted) / 0.5)",
                    border: i === step ? "2px solid hsl(var(--primary))" : "none",
                    color: i <= step ? (i < step ? "hsl(var(--primary-foreground))" : "hsl(var(--primary))") : "hsl(var(--muted-foreground))",
                    boxShadow: i === step ? "0 0 12px hsl(var(--primary) / 0.3)" : "none",
                    cursor: i <= step ? "pointer" : "not-allowed",
                  }}
                >
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </button>
                <span className="text-[10px] font-medium"
                  style={{ color: i === step ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.6)" }}>
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="h-px w-8 sm:w-12 mx-2 mb-4 transition-all duration-500"
                  style={{ background: i < step ? "hsl(var(--primary) / 0.6)" : "hsl(var(--border) / 0.6)" }} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="panel rounded-2xl p-6 mb-5"
          >
            {stepContent[step]}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm text-muted-foreground transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: "hsl(var(--accent) / 0.6)", border: "1px solid hsl(var(--border) / 0.6)" }}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <span className="text-xs text-muted-foreground/50">{step + 1} / {STEPS.length}</span>

          {step < STEPS.length - 1 && (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="flex items-center gap-1.5 px-4 py-2.5 btn-gradient rounded-xl text-sm text-primary-foreground font-semibold"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
