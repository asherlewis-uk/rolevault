import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell, MessageCircle, Heart, Star, Sparkles, Users, Megaphone, Mail } from "lucide-react";
import { containerVariants, itemVariants } from "@/lib/animations";

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-300 focus:outline-none"
      style={{
        background: checked ? "hsl(var(--primary))" : "hsl(var(--muted) / 0.6)",
        boxShadow: checked ? "0 0 12px hsl(var(--primary) / 0.45)" : "none",
        border: "1px solid hsl(var(--border) / 0.5)",
      }}
    >
      <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-300"
        style={{
          background: checked ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground) / 0.5)",
          transform: checked ? "translateX(20px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

interface SectionRowProps {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function SectionRow({ icon: Icon, iconColor, label, desc, checked, onChange }: SectionRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5"
      style={{ borderBottom: "1px solid hsl(var(--border) / 0.25)" }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `hsl(${iconColor} / 0.12)`, border: `1px solid hsl(${iconColor} / 0.25)` }}>
        <Icon className="w-3.5 h-3.5" style={{ color: `hsl(${iconColor})` }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">{desc}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export default function Notifications() {
  const [push, setPush] = useState({
    messages: true,
    reactions: true,
    newChars: false,
    featured: true,
    follows: false,
    updates: true,
  });
  const [email, setEmail] = useState({
    digest: true,
    marketing: false,
    billing: true,
    security: true,
  });

  const toggle = (
    group: "push" | "email",
    key: string,
    val: boolean
  ) => {
    if (group === "push") setPush((p) => ({ ...p, [key]: val }));
    else setEmail((e) => ({ ...e, [key]: val }));
  };

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 mesh-grid opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-1/3 w-72 h-72 bg-radial-violet opacity-[0.06] blur-3xl pointer-events-none" />

      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{
          background: "hsl(var(--card) / 0.72)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid hsl(var(--border) / 0.4)",
        }}
      >
        <Link to="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-6 h-6 rounded-lg btn-gradient flex items-center justify-center">
            <Bell className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-sm gradient-text">Notifications</span>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-xl mx-auto px-4 pt-6 pb-safe-nav lg:pb-10 relative z-10 space-y-5"
      >
        {/* Master toggle banner */}
        <motion.div
          variants={itemVariants}
          className="panel rounded-2xl p-4 flex items-center gap-4"
          style={{ background: "hsl(var(--primary) / 0.07)", borderColor: "hsl(var(--primary) / 0.3)" }}
        >
          <div className="w-10 h-10 rounded-xl btn-gradient flex items-center justify-center flex-shrink-0">
            <Bell className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-sm text-foreground">All Notifications</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">Master toggle for all alerts</p>
          </div>
          <Toggle checked={true} onChange={() => {}} />
        </motion.div>

        {/* Push notifications */}
        <motion.div variants={itemVariants}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 mb-2">
            Push Notifications
          </p>
          <div
            className="panel rounded-2xl overflow-hidden"
            style={{ padding: 0 }}
          >
            <SectionRow icon={MessageCircle} iconColor="var(--spectral-violet)" label="New Messages" desc="When a character responds to you" checked={push.messages} onChange={(v) => toggle("push", "messages", v)} />
            <SectionRow icon={Heart} iconColor="var(--spectral-pink)" label="Reactions" desc="Likes and reactions on your characters" checked={push.reactions} onChange={(v) => toggle("push", "reactions", v)} />
            <SectionRow icon={Sparkles} iconColor="var(--spectral-cyan)" label="New Characters" desc="Characters created by people you follow" checked={push.newChars} onChange={(v) => toggle("push", "newChars", v)} />
            <SectionRow icon={Star} iconColor="var(--spectral-amber)" label="Featured" desc="When your character gets featured" checked={push.featured} onChange={(v) => toggle("push", "featured", v)} />
            <SectionRow icon={Users} iconColor="var(--spectral-green)" label="Follows" desc="When someone follows your profile" checked={push.follows} onChange={(v) => toggle("push", "follows", v)} />
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(var(--primary) / 0.12)", border: "1px solid hsl(var(--primary) / 0.25)" }}>
                <Megaphone className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">App Updates</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">New features and improvements</p>
              </div>
              <Toggle checked={push.updates} onChange={(v) => toggle("push", "updates", v)} />
            </div>
          </div>
        </motion.div>

        {/* Email */}
        <motion.div variants={itemVariants}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 mb-2">
            Email
          </p>
          <div className="panel rounded-2xl overflow-hidden" style={{ padding: 0 }}>
            <SectionRow icon={Mail} iconColor="var(--spectral-cyan)" label="Weekly Digest" desc="Your activity summary each week" checked={email.digest} onChange={(v) => toggle("email", "digest", v)} />
            <SectionRow icon={Megaphone} iconColor="var(--spectral-amber)" label="Marketing" desc="Tips, stories and product news" checked={email.marketing} onChange={(v) => toggle("email", "marketing", v)} />
            <SectionRow icon={Star} iconColor="var(--spectral-green)" label="Billing Receipts" desc="Invoices and subscription changes" checked={email.billing} onChange={(v) => toggle("email", "billing", v)} />
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(var(--destructive) / 0.1)", border: "1px solid hsl(var(--destructive) / 0.2)" }}>
                <Bell className="w-3.5 h-3.5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Security Alerts</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Sign-ins and account changes</p>
              </div>
              <Toggle checked={email.security} onChange={(v) => toggle("email", "security", v)} />
            </div>
          </div>
        </motion.div>

        {/* Quiet hours */}
        <motion.div variants={itemVariants}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 mb-2">
            Quiet Hours
          </p>
          <div className="panel rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-foreground">Do Not Disturb</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Silence all push notifications</p>
              </div>
              <Toggle checked={false} onChange={() => {}} />
            </div>
            <div className="grid grid-cols-2 gap-3 opacity-40 pointer-events-none">
              {["From", "Until"].map((label) => (
                <div key={label}>
                  <p className="text-[10px] text-muted-foreground/60 mb-1.5 uppercase tracking-wider">{label}</p>
                  <div className="panel rounded-xl px-3 py-2.5 text-sm font-medium text-foreground text-center">
                    {label === "From" ? "10:00 PM" : "8:00 AM"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
