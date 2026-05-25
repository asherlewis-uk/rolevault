import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  User, Settings, Bell, Shield, CreditCard, LogOut,
  Edit2, MessageCircle, Heart, Bookmark, Star,
  ChevronRight, Sparkles, Crown, Check, ArrowLeft,
  Mail, Lock, Eye, EyeOff, Save, X, AlertCircle,
  Smile, Brain, Mic2, Palette, Globe,
} from "lucide-react";
import { characters } from "@/data/characters";
import { useAuth } from "@/context/AuthContext";
import { useRecentChats } from "@/hooks/useRecentChats";
import { useFavourites } from "@/hooks/useFavourites";
import { useInputFocus } from "@/hooks/useInputFocus";

const tabs = ["Overview", "Account", "Persona", "Characters", "Settings"];

const plans = [
  {
    id: "free", name: "Explorer", price: "Free", period: "",
    features: ["100 messages/day", "50+ characters", "Standard speed"],
    current: true,
  },
  {
    id: "pro", name: "Voyager", price: "$9.99", period: "/mo",
    features: ["Unlimited messages", "All characters", "Priority speed", "Create 10 characters"],
    current: false,
  },
  {
    id: "ultra", name: "Luminary", price: "$24.99", period: "/mo",
    features: ["Everything in Voyager", "Unlimited characters", "Advanced AI models", "Early access"],
    current: false,
  },
];

const tones = ["Friendly", "Professional", "Playful", "Philosophical", "Direct", "Empathetic"];
const interests = ["Sci-Fi", "Philosophy", "Gaming", "Art", "Music", "Science", "History", "Travel", "Wellness", "Technology"];

function InfoBanner({ message, type = "info" }: { message: string; type?: "info" | "success" | "error" }) {
  const colors = {
    info: "hsl(var(--primary) / 0.12)",
    success: "hsl(var(--spectral-emerald) / 0.12)",
    error: "hsl(var(--destructive) / 0.12)",
  };
  const borders = {
    info: "hsl(var(--primary) / 0.3)",
    success: "hsl(var(--spectral-emerald) / 0.3)",
    error: "hsl(var(--destructive) / 0.3)",
  };
  const textColors = {
    info: "hsl(var(--primary))",
    success: "hsl(var(--spectral-emerald))",
    error: "hsl(var(--destructive))",
  };
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
      style={{ background: colors[type], border: `1px solid ${borders[type]}`, color: textColors[type] }}>
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      {message}
    </div>
  );
}

export default function Profile() {
  const { user, signOut, updateUserMeta, updateEmail, updatePassword } = useAuth();

  // Helper to read legacy/local metadata since new auth doesn't have user_metadata
  const getMeta = (key: string, fallback: string) => {
    try {
      const stored = localStorage.getItem(`rolevault_meta_${key}`);
      return stored ?? fallback;
    } catch {
      return fallback;
    }
  };
  const { recents, getCharacter } = useRecentChats();
  const { favouriteChars } = useFavourites();
  const navigate = useNavigate();

  // Input focus hooks
  const emailFocus = useInputFocus();
  const newPassFocus = useInputFocus();
  const confirmPassFocus = useInputFocus();
  const personaNameFocus = useInputFocus();

  // Active tab
  const [activeTab, setActiveTab] = useState("Overview");

  // Profile edit
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(
    user?.displayName ?? user?.email?.split("@")[0] ?? "User"
  );
  const [bio, setBio] = useState(
    getMeta("bio", "Avid explorer of imaginary worlds and philosophical rabbit holes.")
  );
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Account management
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountMsg, setAccountMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [accountSaving, setAccountSaving] = useState(false);

  // Persona settings
  const [selectedTone, setSelectedTone] = useState<string>(getMeta("persona_tone", "Friendly"));
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    (() => { try { return JSON.parse(getMeta("persona_interests", "[\"Sci-Fi\",\"Philosophy\"]")); } catch { return ["Sci-Fi", "Philosophy"]; } })()
  );
  const [personaName, setPersonaName] = useState(getMeta("persona_name", ""));
  const [personaMsg, setPersonaMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [personaSaving, setPersonaSaving] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await updateUserMeta({ full_name: displayName, bio });
    setSaving(false);
    if (error) {
      setProfileMsg({ text: error, type: "error" });
    } else {
      setProfileMsg({ text: "Profile updated!", type: "success" });
      setEditing(false);
      setTimeout(() => setProfileMsg(null), 3000);
    }
  };

  const handleSaveEmail = async () => {
    if (!newEmail.trim()) return;
    setAccountSaving(true);
    const { error } = await updateEmail(newEmail.trim());
    setAccountSaving(false);
    if (error) {
      setAccountMsg({ text: error, type: "error" });
    } else {
      setAccountMsg({ text: "Confirmation sent to your new email address.", type: "success" });
      setNewEmail("");
      setTimeout(() => setAccountMsg(null), 5000);
    }
  };

  const handleSavePassword = async () => {
    if (newPassword !== confirmPassword) {
      setAccountMsg({ text: "Passwords don't match.", type: "error" });
      return;
    }
    if (newPassword.length < 6) {
      setAccountMsg({ text: "Password must be at least 6 characters.", type: "error" });
      return;
    }
    setAccountSaving(true);
    const { error } = await updatePassword(newPassword);
    setAccountSaving(false);
    if (error) {
      setAccountMsg({ text: error, type: "error" });
    } else {
      setAccountMsg({ text: "Password updated successfully.", type: "success" });
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setAccountMsg(null), 3000);
    }
  };

  const handleSavePersona = async () => {
    setPersonaSaving(true);
    const { error } = await updateUserMeta({
      persona_name: personaName,
      persona_tone: selectedTone,
      persona_interests: JSON.stringify(selectedInterests),
    });
    setPersonaSaving(false);
    if (error) {
      setPersonaMsg({ text: error, type: "error" });
    } else {
      setPersonaMsg({ text: "Persona saved!", type: "success" });
      setTimeout(() => setPersonaMsg(null), 3000);
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const currentDisplayName = user?.displayName ?? user?.email?.split("@")[0] ?? "User";

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 mesh-grid opacity-25 pointer-events-none" />
      <div className="absolute top-0 right-1/3 w-80 h-80 bg-radial-violet opacity-[0.07] blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{
          background: "hsl(var(--card) / 0.72)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid hsl(var(--border) / 0.4)",
        }}>
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-6 h-6 rounded-lg btn-gradient flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-sm gradient-text">Profile</span>
        </div>
        <Link to="/settings/preferences" className="text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="w-4 h-4" />
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-7 pb-10 relative z-10">

        {/* Profile card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="panel rounded-2xl p-6 mb-5">
          <div className="flex items-start gap-5">
            <div className="relative flex-shrink-0">
              <div
                className="w-[4.5rem] h-[4.5rem] rounded-2xl flex items-center justify-center"
                style={{
                  background: "hsl(var(--muted) / 0.6)",
                  border: "2px solid hsl(var(--primary) / 0.3)",
                  boxShadow: "0 0 20px hsl(var(--primary) / 0.15)",
                }}
              >
                <User className="w-8 h-8 text-muted-foreground/60" strokeWidth={1.5} />
              </div>
              <button
                onClick={() => setEditing(true)}
                className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full btn-gradient flex items-center justify-center"
              >
                <Edit2 className="w-2.5 h-2.5 text-primary-foreground" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {editing ? (
                  <motion.div key="editing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Display name"
                      className="font-display font-bold text-foreground text-sm focus:outline-none w-full rounded-lg px-3 py-1.5"
                      style={{ background: "hsl(var(--background) / 0.6)", border: "1px solid hsl(var(--primary) / 0.4)" }}
                    />
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={2}
                      placeholder="Short bio…"
                      className="text-muted-foreground text-xs focus:outline-none w-full resize-none rounded-lg px-3 py-1.5"
                      style={{ background: "hsl(var(--background) / 0.4)", border: "1px solid hsl(var(--border) / 0.6)" }}
                    />
                    {profileMsg && <InfoBanner message={profileMsg.text} type={profileMsg.type} />}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="text-xs btn-gradient px-3 py-1.5 rounded-lg text-primary-foreground font-semibold flex items-center gap-1.5 disabled:opacity-60"
                      >
                        <Save className="w-3 h-3" />{saving ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={() => { setEditing(false); setDisplayName(currentDisplayName); }}
                        className="text-xs px-3 py-1.5 rounded-lg text-muted-foreground flex items-center gap-1.5"
                        style={{ background: "hsl(var(--accent) / 0.6)", border: "1px solid hsl(var(--border) / 0.6)" }}
                      >
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="viewing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h1 className="font-display font-bold text-xl text-foreground">{currentDisplayName}</h1>
                      <Crown className="w-4 h-4 text-secondary" />
                    </div>
                    <p className="text-muted-foreground text-xs mb-1 leading-relaxed">
                      {getMeta("bio", "Avid explorer of imaginary worlds and philosophical rabbit holes.")}
                    </p>
                    <p className="text-[11px] text-muted-foreground/45 mb-3">{user?.email}</p>
                    {profileMsg && <InfoBanner message={profileMsg.text} type={profileMsg.type} />}
                    <button
                      onClick={() => setEditing(true)}
                      className="text-xs px-3 py-1.5 rounded-lg text-muted-foreground flex items-center gap-1.5 transition-all duration-200"
                      style={{ background: "hsl(var(--accent) / 0.6)", border: "1px solid hsl(var(--border) / 0.6)" }}
                    >
                      <Edit2 className="w-3 h-3" /> Edit Profile
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 mt-5 pt-5" style={{ borderTop: "1px solid hsl(var(--border) / 0.4)" }}>
            {[
              { icon: MessageCircle, label: "Chats",   value: recents.length > 0 ? `${recents.length}` : "0" },
              { icon: Heart,         label: "Liked",   value: `${favouriteChars.length}` },
              { icon: Bookmark,      label: "Saved",   value: "0" },
              { icon: Star,          label: "Created", value: "0" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center">
                <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="font-display font-bold text-base text-foreground">{value}</p>
                <p className="text-[10px] text-muted-foreground/60">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-5 overflow-x-auto scrollbar-none"
          style={{ background: "hsl(var(--card) / 0.5)", border: "1px solid hsl(var(--border) / 0.4)" }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-shrink-0 flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-250 whitespace-nowrap"
              style={{
                background: activeTab === tab ? "hsl(var(--primary))" : "transparent",
                color: activeTab === tab ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                boxShadow: activeTab === tab ? "var(--shadow-glow-primary)" : "none",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {activeTab === "Overview" && (
          <motion.div key="overview" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }} className="space-y-6">
            {/* Plans */}
            <div>
              <h2 className="font-display text-base font-bold text-foreground mb-4 flex items-center gap-2">
                <Crown className="w-4 h-4 text-secondary" /> Subscription Plans
              </h2>
              <div className="grid md:grid-cols-3 gap-3">
                {plans.map((plan, i) => (
                  <div key={plan.id} className="panel rounded-xl p-5 transition-all duration-200"
                    style={{
                      borderColor: plan.current
                        ? "hsl(var(--primary) / 0.35)"
                        : i === 1 ? "hsl(var(--secondary) / 0.25)" : "hsl(var(--border) / 0.5)",
                      background: plan.current ? "hsl(var(--primary) / 0.06)" : i === 2 ? "hsl(var(--primary) / 0.04)" : undefined,
                    }}>
                    {plan.current && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-3"
                        style={{ background: "hsl(var(--primary) / 0.15)", border: "1px solid hsl(var(--primary) / 0.3)", color: "hsl(var(--primary))" }}>
                        Current Plan
                      </span>
                    )}
                    <h3 className="font-display font-bold text-foreground text-sm mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-0.5 mb-4">
                      <span className={`text-2xl font-display font-bold ${i === 1 ? "text-secondary" : i === 2 ? "gradient-text" : "text-foreground"}`}>
                        {plan.price}
                      </span>
                      {plan.period && <span className="text-xs text-muted-foreground">{plan.period}</span>}
                    </div>
                    <ul className="space-y-1.5 mb-4">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-primary flex-shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    {!plan.current && (
                      <button
                        className={`w-full py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${i === 1 ? "text-secondary" : "btn-gradient text-primary-foreground"}`}
                        style={i === 1 ? { background: "hsl(var(--secondary) / 0.12)", border: "1px solid hsl(var(--secondary) / 0.35)" } : {}}
                      >
                        Upgrade
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent chats */}
            <div>
              <h2 className="font-display text-base font-bold text-foreground mb-4 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" /> Recent Conversations
              </h2>
              {recents.length === 0 ? (
                <div className="panel rounded-xl p-6 text-center">
                  <MessageCircle className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground/50">No chats yet — start a conversation!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recents.map((chat) => {
                    const char = getCharacter(chat.characterId);
                    if (!char) return null;
                    return (
                      <Link key={chat.characterId} to={`/chat/${char.id}`}>
                        <div className="panel rounded-xl p-3.5 flex items-center gap-3 cursor-pointer transition-all duration-200 mb-2"
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary) / 0.25)"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border) / 0.5)"}>
                          <img src={char.avatar} alt={char.name}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            style={{ boxShadow: "0 0 0 1.5px hsl(var(--primary) / 0.25)" }} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm">{char.name}</p>
                            <p className="text-xs text-muted-foreground/60 truncate">{chat.lastMessage}</p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Account ── */}
        {activeTab === "Account" && (
          <motion.div key="account" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1">Account Management</p>

            {accountMsg && <InfoBanner message={accountMsg.text} type={accountMsg.type} />}

            {/* Current account info */}
            <div className="panel rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">Current Account</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg icon-box-primary flex items-center justify-center flex-shrink-0">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground/60">Email address</p>
                  <p className="text-sm font-medium text-foreground">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Change email */}
            <div className="panel rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="w-3.5 h-3.5 text-primary" />
                <p className="text-sm font-semibold text-foreground">Change Email</p>
              </div>
              <p className="text-xs text-muted-foreground/60">A confirmation link will be sent to your new address.</p>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="New email address"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm surface-inset"
                onFocus={emailFocus.handleFocus}
                onBlur={emailFocus.handleBlur}
              />
              <button
                onClick={handleSaveEmail}
                disabled={!newEmail.trim() || accountSaving}
                className="btn-gradient rounded-xl px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-3 h-3" />{accountSaving ? "Saving…" : "Update Email"}
              </button>
            </div>

            {/* Change password */}
            <div className="panel rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-3.5 h-3.5 text-primary" />
                <p className="text-sm font-semibold text-foreground">Change Password</p>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm surface-inset pr-10"
                  onFocus={newPassFocus.handleFocus}
                  onBlur={newPassFocus.handleBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm surface-inset"
                onFocus={confirmPassFocus.handleFocus}
                onBlur={confirmPassFocus.handleBlur}
              />
              <button
                onClick={handleSavePassword}
                disabled={!newPassword || !confirmPassword || accountSaving}
                className="btn-gradient rounded-xl px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50 flex items-center gap-1.5"
              >
                <Lock className="w-3 h-3" />{accountSaving ? "Saving…" : "Update Password"}
              </button>
            </div>

            {/* Danger zone */}
            <div className="panel rounded-2xl p-4 space-y-3" style={{ borderColor: "hsl(var(--destructive) / 0.2)" }}>
              <p className="text-xs font-semibold text-destructive/80 uppercase tracking-wider">Danger Zone</p>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 text-left"
                style={{ background: "hsl(var(--destructive) / 0.06)", border: "1px solid hsl(var(--destructive) / 0.2)" }}
              >
                <LogOut className="w-4 h-4 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">Sign Out</p>
                  <p className="text-xs text-muted-foreground/60">You'll need to sign in again</p>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Persona ── */}
        {activeTab === "Persona" && (
          <motion.div key="persona" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1">Your AI Persona</p>
            <p className="text-xs text-muted-foreground/60 px-1 -mt-2">How you'd like AI characters to perceive and respond to you.</p>

            {personaMsg && <InfoBanner message={personaMsg.text} type={personaMsg.type} />}

            {/* Persona name */}
            <div className="panel rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Smile className="w-3.5 h-3.5 text-primary" />
                <p className="text-sm font-semibold text-foreground">Persona Name</p>
              </div>
              <p className="text-xs text-muted-foreground/60">The name characters will call you (leave blank to use your display name).</p>
              <input
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
                placeholder={currentDisplayName}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm surface-inset"
                onFocus={personaNameFocus.handleFocus}
                onBlur={personaNameFocus.handleBlur}
              />
            </div>

            {/* Preferred tone */}
            <div className="panel rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Mic2 className="w-3.5 h-3.5 text-primary" />
                <p className="text-sm font-semibold text-foreground">Preferred Tone</p>
              </div>
              <p className="text-xs text-muted-foreground/60">How you prefer characters to communicate with you.</p>
              <div className="flex flex-wrap gap-2">
                {tones.map((tone) => (
                  <button
                    key={tone}
                    onClick={() => setSelectedTone(tone)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                    style={{
                      background: selectedTone === tone ? "hsl(var(--primary) / 0.14)" : "hsl(var(--accent) / 0.5)",
                      border: `1px solid ${selectedTone === tone ? "hsl(var(--primary) / 0.4)" : "hsl(var(--border) / 0.4)"}`,
                      color: selectedTone === tone ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                      boxShadow: selectedTone === tone ? "0 0 10px hsl(var(--primary) / 0.15)" : "none",
                    }}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div className="panel rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-primary" />
                <p className="text-sm font-semibold text-foreground">Interests</p>
              </div>
              <p className="text-xs text-muted-foreground/60">Characters will weave these into conversation naturally.</p>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => {
                  const active = selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                      style={{
                        background: active ? "hsl(var(--spectral-gold) / 0.12)" : "hsl(var(--accent) / 0.5)",
                        border: `1px solid ${active ? "hsl(var(--spectral-gold) / 0.4)" : "hsl(var(--border) / 0.4)"}`,
                        color: active ? "hsl(var(--spectral-gold))" : "hsl(var(--muted-foreground))",
                      }}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Display style */}
            <div className="panel rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-primary" />
                <p className="text-sm font-semibold text-foreground">AI Interaction Style</p>
              </div>
              <div className="space-y-2">
                {[
                  { id: "immersive", label: "Immersive", desc: "Characters fully inhabit their persona" },
                  { id: "balanced", label: "Balanced", desc: "Blend of character and helpful assistant" },
                  { id: "assistant", label: "Assistant-first", desc: "Characters stay helpful and grounded" },
                ].map(({ id, label, desc }) => {
                  const isSelected = (getMeta("persona_style", "immersive")) === id;
                  return (
                    <button
                      key={id}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 text-left"
                      style={{
                        background: isSelected ? "hsl(var(--primary) / 0.08)" : "hsl(var(--accent) / 0.3)",
                        border: `1px solid ${isSelected ? "hsl(var(--primary) / 0.35)" : "hsl(var(--border) / 0.4)"}`,
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{
                          border: `2px solid ${isSelected ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                          background: isSelected ? "hsl(var(--primary))" : "transparent",
                        }}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground/60">{desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleSavePersona}
              disabled={personaSaving}
              className="w-full btn-gradient rounded-xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />{personaSaving ? "Saving…" : "Save Persona"}
            </button>
          </motion.div>
        )}

        {/* ── Characters ── */}
        {activeTab === "Characters" && (
          <motion.div key="chars" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }}>
            <div className="panel rounded-xl p-10 text-center">
              <Sparkles className="w-10 h-10 text-primary/25 mx-auto mb-4" />
              <p className="text-foreground font-semibold mb-1.5">No characters yet</p>
              <p className="text-xs text-muted-foreground mb-5 max-w-xs mx-auto">Bring your imagination to life with the character studio.</p>
              <Link to="/create">
                <button className="btn-gradient rounded-xl px-6 py-2.5 text-xs font-semibold text-primary-foreground">
                  Create a Character
                </button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* ── Settings ── */}
        {activeTab === "Settings" && (
          <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            {[
              { icon: Bell,        label: "Notifications",  desc: "Manage push & email alerts",     to: "/settings/notifications" },
              { icon: Shield,      label: "Privacy & Safety", desc: "Content filters and blocking", to: "/settings/privacy" },
              { icon: CreditCard,  label: "Billing",        desc: "Manage subscription & payment",  to: "/settings/billing" },
              { icon: Settings,    label: "Preferences",    desc: "Theme, language & display",      to: "/settings/preferences" },
              { icon: Globe,       label: "Language",       desc: "App language and region",        to: "/settings/preferences" },
            ].map(({ icon: Icon, label, desc, to }) => (
              <Link key={label} to={to}>
                <div
                  className="panel rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all duration-200 mb-2"
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary) / 0.25)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border) / 0.5)"}
                >
                  <div className="w-8 h-8 rounded-lg icon-box-primary flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground/60">{desc}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                </div>
              </Link>
            ))}

            <button
              onClick={handleSignOut}
              className="w-full panel rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all duration-200 text-left"
              style={{ borderColor: "hsl(var(--destructive) / 0.2)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "hsl(var(--destructive) / 0.07)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "hsl(var(--destructive) / 0.1)", border: "1px solid hsl(var(--destructive) / 0.2)" }}>
                <LogOut className="w-3.5 h-3.5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium text-destructive">Sign Out</p>
                <p className="text-xs text-muted-foreground/60">You'll need to sign in again</p>
              </div>
            </button>
          </motion.div>
        )}

      </div>
    </div>
  );
}
