import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Eye, EyeOff, Lock, Users, MessageCircle, Ban, AlertTriangle, ChevronRight, CheckCircle } from "lucide-react";
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

type SelectOption = { value: string; label: string };
function SelectRow({ label, desc, options, value, onChange }: {
  label: string; desc: string; options: SelectOption[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="px-4 py-3.5" style={{ borderBottom: "1px solid hsl(var(--border) / 0.25)" }}>
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">{desc}</p>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
            style={{
              background: value === o.value ? "hsl(var(--primary))" : "hsl(var(--accent) / 0.5)",
              color: value === o.value ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
              boxShadow: value === o.value ? "0 0 10px hsl(var(--primary) / 0.35)" : "none",
              border: `1px solid ${value === o.value ? "hsl(var(--primary) / 0.5)" : "hsl(var(--border) / 0.4)"}`,
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Privacy() {
  const [privacy, setPrivacy] = useState({
    profilePublic: true,
    showActivity: false,
    allowMessages: "everyone",
    whoCanFollow: "everyone",
    explicitContent: false,
    safeMode: true,
    dataPersonalization: true,
    analyticsSharing: false,
  });

  const set = (key: string, val: boolean | string) =>
    setPrivacy((p) => ({ ...p, [key]: val }));

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 mesh-grid opacity-20 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-72 h-72 opacity-[0.06] blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--spectral-emerald)) 0%, transparent 70%)" }} />

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
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "hsl(var(--spectral-emerald) / 0.2)", border: "1px solid hsl(var(--spectral-emerald) / 0.4)" }}>
            <Shield className="w-3 h-3" style={{ color: "hsl(var(--spectral-emerald))" }} />
          </div>
          <span className="font-display font-bold text-sm gradient-text">Privacy & Safety</span>
        </div>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show"
        className="max-w-xl mx-auto px-4 pt-6 pb-safe-nav lg:pb-10 relative z-10 space-y-5">

        {/* Safety score */}
        <motion.div variants={itemVariants} className="panel rounded-2xl p-4"
          style={{ background: "hsl(var(--spectral-emerald) / 0.06)", borderColor: "hsl(var(--spectral-emerald) / 0.3)" }}>
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--border)/0.3)" strokeWidth="2.5" />
                <circle cx="18" cy="18" r="15.9" fill="none"
                  stroke="hsl(var(--spectral-emerald))" strokeWidth="2.5"
                  strokeDasharray="80 100" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle className="w-4 h-4" style={{ color: "hsl(var(--spectral-emerald))" }} />
              </div>
            </div>
            <div>
              <p className="font-display font-bold text-base text-foreground">Safety Score: 80%</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">Enable Safe Mode to reach 100%</p>
            </div>
          </div>
        </motion.div>

        {/* Profile visibility */}
        <motion.div variants={itemVariants}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 mb-2">Profile</p>
          <div className="panel rounded-2xl overflow-hidden" style={{ padding: 0 }}>
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid hsl(var(--border) / 0.25)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(var(--primary) / 0.12)", border: "1px solid hsl(var(--primary) / 0.25)" }}>
                <Eye className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Public Profile</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Anyone can view your profile and characters</p>
              </div>
              <Toggle checked={privacy.profilePublic} onChange={(v) => set("profilePublic", v)} />
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(var(--spectral-emerald) / 0.1)", border: "1px solid hsl(var(--spectral-emerald) / 0.2)" }}>
                <EyeOff className="w-3.5 h-3.5" style={{ color: "hsl(var(--spectral-emerald))" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Activity Status</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Show when you're online</p>
              </div>
              <Toggle checked={privacy.showActivity} onChange={(v) => set("showActivity", v)} />
            </div>
          </div>
        </motion.div>

        {/* Interactions */}
        <motion.div variants={itemVariants}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 mb-2">Interactions</p>
          <div className="panel rounded-2xl overflow-hidden" style={{ padding: 0 }}>
            <SelectRow label="Who can message you" desc="Control who can start a conversation"
              options={[{ value: "everyone", label: "Everyone" }, { value: "followers", label: "Followers" }, { value: "none", label: "No one" }]}
              value={privacy.allowMessages} onChange={(v) => set("allowMessages", v)} />
            <SelectRow label="Who can follow you" desc="Restrict new followers"
              options={[{ value: "everyone", label: "Everyone" }, { value: "approval", label: "Approval" }, { value: "none", label: "No one" }]}
              value={privacy.whoCanFollow} onChange={(v) => set("whoCanFollow", v)} />
          </div>
        </motion.div>

        {/* Content filters */}
        <motion.div variants={itemVariants}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 mb-2">Content</p>
          <div className="panel rounded-2xl overflow-hidden" style={{ padding: 0 }}>
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid hsl(var(--border) / 0.25)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(var(--destructive) / 0.1)", border: "1px solid hsl(var(--destructive) / 0.2)" }}>
                <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Safe Mode</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Filter mature and sensitive content</p>
              </div>
              <Toggle checked={privacy.safeMode} onChange={(v) => set("safeMode", v)} />
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(var(--spectral-rose) / 0.1)", border: "1px solid hsl(var(--spectral-rose) / 0.2)" }}>
                <Lock className="w-3.5 h-3.5" style={{ color: "hsl(var(--spectral-rose))" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Explicit Content</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Allow mature character content (18+)</p>
              </div>
              <Toggle checked={privacy.explicitContent} onChange={(v) => set("explicitContent", v)} />
            </div>
          </div>
        </motion.div>

        {/* Data */}
        <motion.div variants={itemVariants}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 mb-2">Data & Privacy</p>
          <div className="panel rounded-2xl overflow-hidden" style={{ padding: 0 }}>
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid hsl(var(--border) / 0.25)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(var(--primary) / 0.12)", border: "1px solid hsl(var(--primary) / 0.25)" }}>
                <Users className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Personalization</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Use your activity to improve recommendations</p>
              </div>
              <Toggle checked={privacy.dataPersonalization} onChange={(v) => set("dataPersonalization", v)} />
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid hsl(var(--border) / 0.25)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(var(--muted) / 0.4)", border: "1px solid hsl(var(--border) / 0.4)" }}>
                <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Analytics Sharing</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Help improve the platform anonymously</p>
              </div>
              <Toggle checked={privacy.analyticsSharing} onChange={(v) => set("analyticsSharing", v)} />
            </div>
            <button className="flex items-center gap-3 px-4 py-3.5 w-full text-left">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(var(--destructive) / 0.1)", border: "1px solid hsl(var(--destructive) / 0.2)" }}>
                <Ban className="w-3.5 h-3.5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Blocked Users</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Manage your blocked list</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
            </button>
          </div>
        </motion.div>

        {/* Download data */}
        <motion.div variants={itemVariants}>
          <button className="w-full panel rounded-2xl p-4 flex items-center gap-3 text-left transition-all duration-200"
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary) / 0.3)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = ""}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "hsl(var(--primary) / 0.12)", border: "1px solid hsl(var(--primary) / 0.25)" }}>
              <Lock className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Download Your Data</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Export all your conversations and content</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
          </button>
        </motion.div>

      </motion.div>
    </div>
  );
}
