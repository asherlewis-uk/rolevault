import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Heart, Share2, ArrowLeft,
  Users, Bookmark, Tag, ChevronRight,
  Star, Sparkles, MessageSquare, Shield, Info,
} from "lucide-react";
import { characters } from "@/data/characters";
import { useFavourites } from "@/hooks/useFavourites";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// Category → spectral accent color (CSS var hsl values)
const categorySpectral: Record<string, { hsl: string; label: string }> = {
  Companions:  { hsl: "var(--spectral-violet)", label: "Companion" },
  Roleplay:    { hsl: "var(--spectral-cyan)",   label: "Roleplay"  },
  Educational: { hsl: "var(--spectral-amber)",  label: "Education" },
  Fantasy:     { hsl: "var(--spectral-pink)",   label: "Fantasy"   },
  Wellness:    { hsl: "var(--spectral-green)",  label: "Wellness"  },
};

const tabs = ["About", "Dialogue", "Details"] as const;
type Tab = typeof tabs[number];

export default function CharacterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const character = characters.find((c) => c.id === id) ?? characters[0];
  const { isFavourite, toggleFavourite } = useFavourites();
  const liked = isFavourite(character.id);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("About");

  const accent = categorySpectral[character.category] ?? { hsl: "var(--primary)", label: character.category };

  return (
    <div className="min-h-screen bg-background relative pb-safe-nav">

      {/* ── Full-bleed hero ── */}
      <div className="relative w-full" style={{ height: "min(72vw, 400px)" }}>
        {/* Avatar fill */}
        <img
          src={character.avatar}
          alt={character.name}
          className="absolute inset-0 w-full h-full object-cover object-top"
        />

        {/* Spectral rim-light overlay — colored edge glow from category */}
        <div className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg,
              hsl(${accent.hsl} / 0.12) 0%,
              transparent 30%,
              transparent 55%,
              hsl(var(--background) / 0.75) 80%,
              hsl(var(--background)) 100%)`,
          }}
        />
        {/* Left edge rim */}
        <div className="absolute inset-y-0 left-0 w-px"
          style={{ background: `linear-gradient(180deg, transparent, hsl(${accent.hsl} / 0.6), transparent)` }} />
        {/* Right edge rim */}
        <div className="absolute inset-y-0 right-0 w-px"
          style={{ background: `linear-gradient(180deg, transparent, hsl(${accent.hsl} / 0.4), transparent)` }} />
        {/* Top spectral glow bloom */}
        <div className="absolute top-0 inset-x-0 h-24 opacity-40"
          style={{ background: `radial-gradient(ellipse 60% 100% at 50% 0%, hsl(${accent.hsl} / 0.3), transparent)` }} />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-safe-top left-4 mt-4 w-9 h-9 rounded-full flex items-center justify-center z-10 transition-all duration-200"
          style={{
            background: "hsl(var(--background) / 0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid hsl(var(--border) / 0.5)",
          }}
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>

        {/* Share */}
        <button
          className="absolute top-4 right-4 mt-safe-top w-9 h-9 rounded-full flex items-center justify-center z-10 transition-all duration-200"
          style={{
            background: "hsl(var(--background) / 0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid hsl(var(--border) / 0.5)",
          }}
        >
          <Share2 className="w-4 h-4 text-foreground" />
        </button>

        {/* Category badge floating on image */}
        <div className="absolute bottom-4 left-4 flex items-center gap-1.5">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: `hsl(${accent.hsl} / 0.18)`,
              border: `1px solid hsl(${accent.hsl} / 0.45)`,
              color: `hsl(${accent.hsl})`,
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}>
            {accent.label}
          </span>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: "hsl(var(--background) / 0.55)",
              border: "1px solid hsl(var(--border) / 0.4)",
              color: "hsl(var(--muted-foreground))",
              backdropFilter: "blur(8px)",
            }}>
            {character.rating}
          </span>
        </div>

        {/* Rating star */}
        <div className="absolute bottom-4 right-4 flex items-center gap-1"
          style={{
            background: "hsl(var(--background) / 0.55)",
            backdropFilter: "blur(8px)",
            border: "1px solid hsl(var(--border) / 0.4)",
            borderRadius: "999px",
            padding: "4px 10px",
          }}>
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span className="text-xs font-bold text-foreground">{character.rating}</span>
        </div>
      </div>

      {/* ── Content below hero ── */}
      <div className="relative px-4 -mt-1 z-10">

        {/* Name + tagline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="pt-3 pb-4"
        >
          <h1 className="font-display font-bold text-[28px] leading-tight text-foreground">{character.name}</h1>
          <p className="text-sm mt-1 leading-relaxed font-medium"
            style={{ color: `hsl(${accent.hsl})`, textShadow: `0 0 18px hsl(${accent.hsl} / 0.35)` }}>
            {character.tagline}
          </p>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06, ease: "easeOut" }}
          className="grid grid-cols-3 gap-2 mb-4"
        >
          {[
            { icon: MessageCircle, label: "Chats", value: formatCount(character.chats), color: accent.hsl },
            { icon: Heart, label: "Likes", value: formatCount(character.likes), color: "var(--spectral-pink)" },
            { icon: Users, label: "Creator", value: character.creator.split(" ")[0], color: "var(--spectral-cyan)" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label}
              className="rounded-xl p-3 text-center"
              style={{
                background: "hsl(var(--card) / 0.5)",
                border: "1px solid hsl(var(--border) / 0.4)",
              }}>
              <Icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: `hsl(${color})` }} />
              <p className="font-display font-bold text-sm text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground/55 mt-0.5">{label}</p>
            </div>
          ))}
        </motion.div>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
          className="mb-3"
        >
          <Link to={`/chat/${character.id}`}>
            <button
              className="w-full btn-gradient rounded-2xl py-4 font-display font-bold text-primary-foreground flex items-center justify-center gap-2 text-base"
              style={{ boxShadow: `0 0 28px hsl(${accent.hsl} / 0.25), 0 4px 20px hsl(var(--primary) / 0.3)` }}
            >
              <MessageCircle className="w-5 h-5" />
              Start Chatting
              <ChevronRight className="w-5 h-5" />
            </button>
          </Link>
        </motion.div>

        {/* Secondary actions: like / save */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.14 }}
          className="grid grid-cols-2 gap-2 mb-5"
        >
          <button
            onClick={() => toggleFavourite(character.id)}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-250"
            style={{
              background: liked ? "hsl(var(--spectral-pink) / 0.14)" : "hsl(var(--card) / 0.5)",
              border: `1px solid hsl(${liked ? "var(--spectral-pink)" : "var(--border)"} / 0.4)`,
              color: liked ? "hsl(var(--spectral-pink))" : "hsl(var(--muted-foreground))",
              boxShadow: liked ? "0 0 14px hsl(var(--spectral-pink) / 0.2)" : "none",
            }}>
            <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
            {liked ? "Liked" : "Like"}
          </button>
          <button
            onClick={() => setSaved((v) => !v)}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-250"
            style={{
              background: saved ? "hsl(var(--primary) / 0.12)" : "hsl(var(--card) / 0.5)",
              border: `1px solid hsl(${saved ? "var(--primary)" : "var(--border)"} / 0.4)`,
              color: saved ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
              boxShadow: saved ? "0 0 14px hsl(var(--primary) / 0.2)" : "none",
            }}>
            <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
            {saved ? "Saved" : "Save"}
          </button>
        </motion.div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-xl mb-4"
          style={{ background: "hsl(var(--card) / 0.45)", border: "1px solid hsl(var(--border) / 0.35)" }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
              style={{
                background: activeTab === tab ? `hsl(${accent.hsl})` : "transparent",
                color: activeTab === tab ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                boxShadow: activeTab === tab ? `0 0 14px hsl(${accent.hsl} / 0.4)` : "none",
              }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === "About" && (
            <motion.div key="about"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="space-y-4 pb-6"
            >
              {/* Description */}
              <div className="panel rounded-2xl p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{character.description}</p>
              </div>

              {/* Tags */}
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Tag className="w-3 h-3 text-muted-foreground/60" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Tags</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {character.tags.map((tag) => (
                    <span key={tag}
                      className="text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-200"
                      style={{
                        background: `hsl(${accent.hsl} / 0.1)`,
                        border: `1px solid hsl(${accent.hsl} / 0.3)`,
                        color: `hsl(${accent.hsl})`,
                      }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Scenario */}
              <div className="panel rounded-2xl p-4"
                style={{ borderColor: `hsl(${accent.hsl} / 0.2)`, background: `hsl(${accent.hsl} / 0.04)` }}>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: `hsl(${accent.hsl})` }}>Scenario</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{character.scenario}</p>
              </div>

              {/* Creator card */}
              <div className="panel rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl btn-gradient flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{character.creator}</p>
                  <p className="text-xs text-muted-foreground/60">Character Creator</p>
                </div>
                <div className="text-[10px] font-bold px-2 py-1 rounded-full"
                  style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.25)" }}>
                  Verified
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "Dialogue" && (
            <motion.div key="dialogue"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="space-y-3 pb-6"
            >
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3 flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" /> Sample Conversation
              </p>

              {/* Greeting */}
              <div className="flex gap-2.5">
                <img src={character.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                  style={{ boxShadow: `0 0 0 2px hsl(${accent.hsl} / 0.4)` }} />
                <div className="bubble-ai rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-foreground max-w-[80%] leading-relaxed"
                  style={{ borderColor: `hsl(${accent.hsl} / 0.15)` }}>
                  {character.greeting}
                </div>
              </div>

              {character.sampleDialogue.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {msg.role === "ai" && (
                    <img src={character.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                      style={{ boxShadow: `0 0 0 2px hsl(${accent.hsl} / 0.4)` }} />
                  )}
                  <div className={`rounded-2xl px-4 py-3 text-sm max-w-[80%] leading-relaxed ${
                    msg.role === "user"
                      ? "bubble-user rounded-tr-sm text-foreground"
                      : "bubble-ai rounded-tl-sm text-foreground"
                  }`} style={msg.role === "ai" ? { borderColor: `hsl(${accent.hsl} / 0.15)` } : {}}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* CTA inside dialogue tab */}
              <div className="pt-2">
                <Link to={`/chat/${character.id}`}>
                  <button className="w-full btn-gradient rounded-2xl py-3.5 font-display font-bold text-primary-foreground flex items-center justify-center gap-2 text-sm">
                    <MessageCircle className="w-4 h-4" />
                    Continue This Conversation
                  </button>
                </Link>
              </div>
            </motion.div>
          )}

          {activeTab === "Details" && (
            <motion.div key="details"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="space-y-4 pb-6"
            >
              {/* Personality */}
              <div className="panel rounded-2xl p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">Personality</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{character.personality}</p>
              </div>

              {/* Stats detail */}
              <div className="panel rounded-2xl overflow-hidden" style={{ padding: 0 }}>
                {[
                  { icon: MessageCircle, label: "Total Conversations", value: formatCount(character.chats), color: accent.hsl },
                  { icon: Heart, label: "Total Likes", value: formatCount(character.likes), color: "var(--spectral-pink)" },
                  { icon: Star, label: "Content Rating", value: character.rating, color: "var(--spectral-amber)" },
                  { icon: Tag, label: "Category", value: character.category, color: "var(--spectral-cyan)" },
                  { icon: Users, label: "Created by", value: character.creator, color: "var(--spectral-green)" },
                ].map(({ icon: Icon, label, value, color }, i) => (
                  <div key={label}
                    className="flex items-center gap-3 px-4 py-3.5"
                    style={{ borderBottom: i < 4 ? "1px solid hsl(var(--border) / 0.25)" : "none" }}>
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `hsl(${color})` }} />
                    <span className="flex-1 text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-semibold text-foreground">{value}</span>
                  </div>
                ))}
              </div>

              {/* Safety */}
              <div className="panel rounded-2xl p-4 flex items-start gap-3"
                style={{ borderColor: "hsl(var(--spectral-green) / 0.25)", background: "hsl(var(--spectral-green) / 0.04)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "hsl(var(--spectral-green) / 0.12)", border: "1px solid hsl(var(--spectral-green) / 0.3)" }}>
                  <Shield className="w-3.5 h-3.5" style={{ color: "hsl(var(--spectral-green))" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Safety & Content</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Rated <span className="text-foreground font-medium">{character.rating}</span> — designed for safe, positive interactions. RoleVault monitors all characters for policy compliance.
                  </p>
                </div>
              </div>

              {/* Report */}
              <button className="w-full flex items-center gap-2 py-3 px-4 rounded-xl text-xs text-muted-foreground/50 justify-center"
                style={{ border: "1px solid hsl(var(--border) / 0.3)" }}>
                <Info className="w-3.5 h-3.5" />
                Report this character
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
