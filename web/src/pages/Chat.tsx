import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Mic, MoreHorizontal, ChevronLeft,
  Heart, Sparkles,
  Plus, Search,
  RefreshCw, ThumbsUp, ThumbsDown, Copy,
  Home, Compass, PlusCircle, User,
} from "lucide-react";
import { characters } from "@/data/characters";
import { AppNavLink } from "@/components/AppNavLink";
import { useRecentChats } from "@/hooks/useRecentChats";
import { useFavourites } from "@/hooks/useFavourites";
import { useLLMProvider } from "@/hooks/useLLMProvider";
import { useInputFocus } from "@/hooks/useInputFocus";
import { streamChat } from "@/lib/chatStream";
import { toast } from "@/components/ui/use-toast";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: Date;
}

const RECENT_CHATS = [
  { id: "lyra" },
  { id: "rex" },
  { id: "sage" },
  { id: "pip" },
  { id: "seraphina" },
];

const navItems = [
  { to: "/", icon: Home, label: "Home", end: true },
  { to: "/discover", icon: Compass, label: "Discover" },
  { to: "/create", icon: PlusCircle, label: "Create" },
  { to: "/profile", icon: User, label: "Profile" },
];

export default function Chat() {
  const { id } = useParams();
  const character = characters.find((c) => c.id === id) ?? characters[0];
  const { addRecentChat } = useRecentChats();
  const { isFavourite, toggleFavourite } = useFavourites();
  const { config: llmConfig, providerMeta } = useLLMProvider();

  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "ai", text: character.greeting, timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const searchFocus = useInputFocus({ borderFocus: "hsl(var(--primary) / 0.4)", borderBlur: "hsl(var(--border) / 0.6)" });
  const chatFocus = useInputFocus();
  const liked = isFavourite(character.id);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Build the system prompt from character personality + scenario
  const buildSystemPrompt = () =>
    `You are ${character.name}. ${character.personality}\n\nScenario: ${character.scenario}\n\nRespond in character at all times. Be concise and engaging. Never break character or reveal you are an AI.`;

  const handleSend = async () => {
    if (!input.trim()) return;
    const trimmed = input.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    addRecentChat(character.id, trimmed);

    // Convert chat history to the format the AI expects
    const historyMsgs = messages.map((m) => ({
      role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
      content: m.text,
    }));

    // Placeholder for streaming AI response
    const aiId = (Date.now() + 1).toString();
    let accumulated = "";

    await streamChat({
      config: llmConfig,
      systemPrompt: buildSystemPrompt(),
      messages: [...historyMsgs, { role: "user" as const, content: trimmed }],
      onDelta: (chunk) => {
        accumulated += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "ai" && last.id === aiId) {
            return prev.map((m) =>
              m.id === aiId ? { ...m, text: accumulated } : m,
            );
          }
          // First chunk — create the AI message
          return [
            ...prev,
            { id: aiId, role: "ai" as const, text: accumulated, timestamp: new Date() },
          ];
        });
        setIsTyping(false);
      },
      onDone: () => {
        setIsTyping(false);
        // If we got no content at all, add a fallback
        if (!accumulated) {
          setMessages((prev) => [
            ...prev,
            {
              id: aiId,
              role: "ai" as const,
              text: "That's a fascinating thought. Tell me more…",
              timestamp: new Date(),
            },
          ]);
        }
      },
      onError: (err) => {
        setIsTyping(false);
        toast({
          title: `${providerMeta.label} error`,
          description: err,
          variant: "destructive",
        });
        // Remove the typing placeholder if we never got content
        if (!accumulated) {
          setMessages((prev) => prev.filter((m) => m.id !== aiId));
        }
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">

      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden lg:flex w-60 flex-col fixed h-full z-20"
        style={{ background: "hsl(var(--sidebar-background))", borderRight: "1px solid hsl(var(--sidebar-border))" }}>

        {/* Brand */}
        <div className="px-4 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}>
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg btn-gradient flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-sm gradient-text">RoleVault</span>
          </Link>
          <Link to="/create">
            <button className="w-6 h-6 rounded-md glass flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
              <Plus className="w-3 h-3" />
            </button>
          </Link>
        </div>

        {/* Search */}
        <div className="px-3 py-3" style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/60" />
            <input
              placeholder="Search chats…"
              className="w-full rounded-lg pl-7 pr-3 py-1.5 text-xs font-body surface-inset"
              onFocus={searchFocus.handleFocus}
              onBlur={searchFocus.handleBlur}
            />
          </div>
        </div>

        {/* Recent chats */}
        <div className="flex-1 overflow-y-auto scrollbar-none py-2">
          <p className="section-label px-4 py-2">Conversations</p>
          {RECENT_CHATS.map((c) => {
            const char = characters.find((ch) => ch.id === c.id);
            const isActive = c.id === id;
            return (
              <Link key={c.id} to={`/chat/${c.id}`}>
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 mx-1.5 rounded-lg cursor-pointer transition-all duration-200 mb-0.5 ${
                    isActive ? "nav-active" : "hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={char?.avatar}
                      alt={char?.name}
                      className="w-7 h-7 rounded-full object-cover"
                      style={{ boxShadow: isActive ? "0 0 0 1.5px hsl(var(--primary) / 0.6)" : "0 0 0 1px hsl(var(--border) / 0.5)" }}
                    />
                    {isActive && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-sidebar-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{char?.name}</p>
                    <p className="text-[10px] text-muted-foreground/60 truncate">
                      {isActive ? "Active now" : "Tap to resume"}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom nav */}
        <div className="px-2 py-2 space-y-0.5" style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}>
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <AppNavLink
              key={to}
              to={to}
              end={end}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-sidebar-accent/50 transition-all duration-200 text-xs font-medium"
              activeClassName="text-foreground bg-sidebar-accent"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </AppNavLink>
          ))}
        </div>
      </aside>

      {/* ── Main ── */}
      {/* On mobile: bottom padding = tab bar (4rem) + safe area so composer is never hidden behind BottomNav */}
      <main className="flex-1 lg:ml-60 flex flex-col overflow-hidden"
        style={{ height: "100dvh" }}>

        {/* Chat header — back arrow left, character name + subtitle centred */}
        <div className="flex-shrink-0 px-4 flex items-center gap-3 relative"
          style={{
            height: "56px",
            background: "hsl(var(--card) / 0.7)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid hsl(var(--border) / 0.4)",
          }}>

          {/* Back */}
          <Link to="/" className="w-9 h-9 flex items-center justify-center text-foreground/70 hover:text-foreground transition-colors flex-shrink-0 -ml-1">
            <ChevronLeft className="w-5 h-5" strokeWidth={2} />
          </Link>

          {/* Centred title block */}
          <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
            <Link to={`/character/${character.id}`} className="pointer-events-auto">
              <p className="font-display font-bold text-foreground text-[15px] leading-tight">{character.name}</p>
            </Link>
            <p className="text-[11px] text-muted-foreground/55 leading-none mt-0.5">AI Character</p>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => toggleFavourite(character.id)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200`}
              style={liked ? {
                color: "hsl(var(--spectral-rose))",
                background: "hsl(var(--spectral-rose) / 0.1)",
                border: "1px solid hsl(var(--spectral-rose) / 0.25)",
              } : {}}
            >
              <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : "text-muted-foreground"}`} />
            </button>
            <button
              onClick={() => toast({ title: "More options", description: "Character settings and chat tools coming soon." })}
              className="w-8 h-8 glass rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto scrollbar-none px-4 py-6"
          style={{ background: "hsl(var(--background))" }}>

          {/* Ambient backdrop for immersion */}
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/3 w-72 h-72 opacity-[0.06] blur-3xl bg-radial-violet" />
            <div className="absolute bottom-1/3 right-1/4 w-64 h-64 opacity-[0.04] blur-3xl bg-radial-crimson" />
          </div>

          <div className="max-w-2xl mx-auto space-y-5 relative z-10">
            {/* Character intro banner */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center py-6 text-center"
            >
              <div className="relative mb-3">
                <img
                  src={character.avatar}
                  alt={character.name}
                  className="w-16 h-16 rounded-full object-cover"
                  style={{ boxShadow: "0 0 0 2px hsl(var(--primary) / 0.4), 0 0 24px hsl(var(--primary) / 0.2)" }}
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full btn-gradient flex items-center justify-center">
                  <Sparkles className="w-2.5 h-2.5 text-primary-foreground" />
                </div>
              </div>
              <p className="font-display font-semibold text-foreground text-sm">{character.name}</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">{character.category} · {character.rating}</p>
              <div className="divider-glow w-32 mt-4" />
            </motion.div>

            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.97, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(idx * 0.03, 0.18), ease: [0.34, 1.56, 0.64, 1] }}
                  className={`flex gap-2.5 group ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  {msg.role === "ai" && (
                    <img
                      src={character.avatar}
                      alt={character.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0 self-end"
                      style={{ boxShadow: "0 0 0 1.5px hsl(var(--secondary) / 0.3)" }}
                    />
                  )}

                  <div className="flex flex-col gap-1" style={{ maxWidth: "68%" }}>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bubble-user rounded-tr-sm text-foreground"
                          : "bubble-ai rounded-tl-sm text-foreground"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <div className={`flex items-center gap-2 px-1 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 ${
                      msg.role === "user" ? "flex-row-reverse" : ""
                    }`}>
                      <span className="text-[10px] text-muted-foreground/40">
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {msg.role === "ai" && (
                        <div className="flex items-center gap-1">
                          <button className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-colors touch-target" aria-label="Like message">
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-colors touch-target" aria-label="Dislike message">
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                          <button className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-colors touch-target" aria-label="Copy message">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {idx === messages.length - 1 && (
                            <button className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground/50 hover:text-primary transition-colors touch-target" aria-label="Regenerate response">
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            <AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="flex gap-2.5 items-end"
                >
                  <img
                    src={character.avatar}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    style={{ boxShadow: "0 0 0 1.5px hsl(var(--secondary) / 0.3)" }}
                  />
                  <div className="bubble-ai rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                    {[0, 0.18, 0.36].map((delay, i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full animate-typing"
                        style={{
                          background: "hsl(var(--secondary) / 0.6)",
                          animationDelay: `${delay}s`,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Composer */}
        <div
          className="flex-shrink-0 px-4 py-3"
          style={{
            paddingBottom: "max(calc(env(safe-area-inset-bottom) + 10px), 12px)",
            background: "hsl(var(--card) / 0.65)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid hsl(var(--border) / 0.4)",
          }}
        >
          <div className="max-w-2xl mx-auto flex items-center gap-2">

            {/* + */}
            <button className="w-9 h-9 flex-shrink-0 flex items-center justify-center text-muted-foreground/70 hover:text-foreground transition-colors touch-target">
              <Plus className="w-[22px] h-[22px]" strokeWidth={1.8} />
            </button>

            {/* Pill input */}
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Type your message…`}
                rows={1}
                className="w-full rounded-full px-4 py-2.5 text-foreground placeholder:text-muted-foreground/40 font-body text-sm resize-none focus:outline-none transition-colors duration-200 block"
                style={{
                  background: "hsl(var(--background) / 0.5)",
                  border: "1px solid hsl(var(--border) / 0.6)",
                  maxHeight: "6rem",
                  overflowY: "auto",
                  lineHeight: "1.4",
                }}
                onFocus={chatFocus.handleFocus}
                onBlur={chatFocus.handleBlur}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 96) + "px";
                }}
              />
            </div>

            {/* Send — filled circle */}
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center touch-target transition-all duration-200 active:scale-95"
              style={{
                background: input.trim() ? "var(--gradient-primary)" : "hsl(var(--muted) / 0.55)",
                boxShadow: input.trim() ? "0 3px 12px hsl(var(--primary) / 0.3)" : "none",
              }}
            >
              <Send
                className="w-4 h-4"
                style={{ color: input.trim() ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground) / 0.45)" }}
              />
            </button>

            {/* Mic — filled circle */}
            <button
              className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-muted-foreground/70 touch-target transition-colors"
              style={{
                background: "hsl(var(--muted) / 0.55)",
                border: "1px solid hsl(var(--border) / 0.35)",
              }}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}
