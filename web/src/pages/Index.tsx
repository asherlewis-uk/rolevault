import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, RefreshCw, Plus, Send, Mic,
  Compass, Search, Sparkles, LogOut,
  Home, Settings,
  Star, PlusCircle, User, ChevronRight, History, MessageCircle,
} from "lucide-react";
import { characters } from "@/data/characters";
import { useAuth } from "@/context/AuthContext";
import { useRecentChats } from "@/hooks/useRecentChats";
import { useInputFocus } from "@/hooks/useInputFocus";
import { useFavourites } from "@/hooks/useFavourites";

const featuredChars = characters.filter((c) => c.featured);

const topNav = [
  { icon: Home,       label: "Home",     to: "/",                     activeOn: "/" },
  { icon: Compass,    label: "Discover", to: "/discover",             activeOn: "/discover" },
  { icon: PlusCircle, label: "Create",   to: "/create",               activeOn: "/create" },
  { icon: User,       label: "Profile",  to: "/profile",              activeOn: "/profile" },
  { icon: Settings,   label: "Settings", to: "/settings/preferences", activeOn: "/settings" },
];

export default function Index() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { recents, getCharacter } = useRecentChats();
  const { favouriteChars } = useFavourites();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [charIdx, setCharIdx]       = useState(0);
  const [input, setInput]           = useState("");
  const inputFocus = useInputFocus();

  const currentChar = featuredChars[charIdx % featuredChars.length] ?? characters[0];

  const handleSend = () => {
    if (!input.trim()) return;
    navigate(`/chat/${currentChar.id}`, { state: { initialMessage: input.trim() } });
  };

  const handleRefresh = () =>
    setCharIdx((i) => (i + 1) % featuredChars.length);

  const displayName = user?.displayName
    ?? user?.email?.split("@")[0]
    ?? "User";

  const close = () => setDrawerOpen(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <div
      className="bg-background flex flex-col overflow-hidden relative"
      style={{ height: "100dvh" }}
    >
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-radial-violet opacity-[0.07] blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-radial-crimson opacity-[0.05] blur-3xl" />
        <div className="absolute inset-0 mesh-grid opacity-[0.04]" />
      </div>

      {/* ── Drawer overlay ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Scrim */}
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={close}
              className="fixed inset-0 z-40"
              style={{ background: "hsl(var(--background) / 0.65)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)" }}
            />

            {/* Drawer panel */}
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%", transition: { type: "spring", damping: 38, stiffness: 380, mass: 0.7, duration: 0.22 } }}
              transition={{ type: "spring", damping: 30, stiffness: 280, mass: 0.9 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-[72vw] max-w-[300px] flex flex-col"
              style={{
                background: "hsl(var(--card) / 0.97)",
                backdropFilter: "blur(28px)",
                WebkitBackdropFilter: "blur(28px)",
                borderRight: "1px solid hsl(var(--border) / 0.45)",
                boxShadow: "8px 0 40px hsl(236 22% 2% / 0.6)",
              }}
            >
              {/* Spectral top edge */}
              <div
                className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.3), transparent)" }}
              />

              {/* Header */}
              <div className="px-6 pt-14 pb-4" style={{ borderBottom: "1px solid hsl(var(--border) / 0.35)" }}>
                <p className="font-display font-bold text-xl text-foreground">Menu</p>
              </div>

              {/* User info */}
              <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid hsl(var(--border) / 0.35)" }}>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "hsl(var(--muted) / 0.8)",
                    border: "1.5px solid hsl(var(--border) / 0.7)",
                  }}
                >
                  <User className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-semibold text-foreground text-sm truncate">{displayName}</p>
                  <p className="text-[11px] text-muted-foreground/55 truncate">{user?.email ?? ""}</p>
                </div>
                <Link to="/profile" onClick={close} className="ml-auto flex-shrink-0">
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                </Link>
              </div>

              {/* Scrollable nav area */}
              <nav className="flex-1 overflow-y-auto scrollbar-none">

                {/* ── Top nav links ── */}
                <div className="px-4 pt-4 pb-1 space-y-0.5">
                  {topNav.map(({ icon: Icon, label, to, activeOn }) => {
                    const isActive = activeOn === "/";
                    return (
                      <Link
                        key={label}
                        to={to}
                        onClick={close}
                        className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200"
                        style={isActive ? {
                          background: "hsl(var(--primary) / 0.09)",
                          border: "1px solid hsl(var(--primary) / 0.22)",
                          boxShadow: "inset 0 1px 0 hsl(var(--primary) / 0.12), 0 0 14px hsl(var(--primary) / 0.07)",
                          color: "hsl(var(--foreground))",
                        } : {
                          border: "1px solid transparent",
                          color: "hsl(var(--muted-foreground))",
                        }}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.6} />
                        <span className="font-display font-medium text-sm">{label}</span>
                      </Link>
                    );
                  })}
                </div>

                {/* ── Recent Chats section ── */}
                <div className="px-4 pt-4 pb-2" style={{ borderTop: "1px solid hsl(var(--border) / 0.28)" }}>
                  <div className="flex items-center justify-between px-1 mb-2">
                    <div className="flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-muted-foreground/60" strokeWidth={1.6} />
                      <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Recent Chats</span>
                    </div>
                    <Link
                      to="/discover"
                      onClick={close}
                      className="flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary transition-colors"
                    >
                      <History className="w-3 h-3" />
                      All history
                    </Link>
                  </div>

                  {recents.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/40 px-1 py-2">No recent chats yet</p>
                  ) : (
                    <div className="space-y-0.5">
                      {recents.map((chat) => {
                        const char = getCharacter(chat.characterId);
                        if (!char) return null;
                        return (
                          <Link
                            key={chat.characterId}
                            to={`/chat/${char.id}`}
                            onClick={close}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group"
                            style={{ border: "1px solid transparent" }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.background = "hsl(var(--muted) / 0.45)";
                              (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border) / 0.4)";
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.background = "";
                              (e.currentTarget as HTMLElement).style.borderColor = "transparent";
                            }}
                          >
                            <img
                              src={char.avatar}
                              alt={char.name}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              style={{ border: "1.5px solid hsl(var(--border) / 0.5)" }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-display font-semibold text-foreground/85 truncate">{char.name}</p>
                              <p className="text-[10px] text-muted-foreground/50 truncate">{chat.lastMessage}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Favourites section ── */}
                <div className="px-4 pt-3 pb-4" style={{ borderTop: "1px solid hsl(var(--border) / 0.28)" }}>
                  <div className="flex items-center justify-between px-1 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-muted-foreground/60" strokeWidth={1.6} />
                      <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Favourites</span>
                    </div>
                    <Link
                      to="/favourites"
                      onClick={close}
                      className="text-[10px] text-primary/70 hover:text-primary transition-colors font-medium"
                    >
                      View all
                    </Link>
                  </div>

                  {favouriteChars.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/40 px-1">No favourites yet — heart a character to pin them here</p>
                  ) : (
                    <div className="flex items-center gap-2.5 px-1 flex-wrap">
                      {favouriteChars.map((char) => (
                        <Link
                          key={char.id}
                          to={`/chat/${char.id}`}
                          onClick={close}
                          className="flex flex-col items-center gap-1 group"
                          title={char.name}
                        >
                          <div
                            className="relative w-12 h-12 rounded-full overflow-hidden transition-all duration-200"
                            style={{
                              border: "2px solid hsl(var(--border) / 0.5)",
                              boxShadow: "0 0 0 0 hsl(var(--primary) / 0)",
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary) / 0.5)";
                              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px hsl(var(--primary) / 0.25)";
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border) / 0.5)";
                              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 0 hsl(var(--primary) / 0)";
                            }}
                          >
                            <img
                              src={char.avatar}
                              alt={char.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground/55 font-display max-w-[48px] truncate text-center leading-tight">
                            {char.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

              </nav>

              {/* Sign out button */}
              <div className="px-4 pb-8" style={{ borderTop: "1px solid hsl(var(--border) / 0.28)" }}>
                <div className="pt-4">
                  <button
                    onClick={() => { close(); signOut(); }}
                    className="w-full py-3.5 rounded-xl font-display font-semibold text-sm text-foreground flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
                    style={{
                      background: "hsl(var(--card) / 0.7)",
                      border: "1px solid hsl(var(--border) / 0.65)",
                      boxShadow: "inset 0 1px 0 hsl(var(--foreground) / 0.04), 0 0 18px hsl(var(--primary) / 0.06)",
                    }}
                  >
                    <LogOut className="w-4 h-4" strokeWidth={1.6} />
                    Sign Out
                  </button>
                </div>
              </div>

              {/* Home indicator */}
              <div className="pb-3 flex justify-center">
                <div
                  className="w-28 h-[3px] rounded-full"
                  style={{ background: "hsl(var(--foreground) / 0.18)" }}
                />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Top bar ── */}
      <div
        className="flex-shrink-0 px-5 flex items-center justify-between relative z-10"
        style={{ height: "56px", paddingTop: "max(env(safe-area-inset-top), 0px)" }}
      >
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-10 h-10 flex items-center justify-center text-foreground/75 hover:text-foreground transition-colors -ml-1"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" strokeWidth={1.8} />
        </button>

        <button
          onClick={handleRefresh}
          className="w-10 h-10 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors -mr-1"
          aria-label="Try another character"
        >
          <RefreshCw className="w-[18px] h-[18px]" strokeWidth={1.8} />
        </button>
      </div>

      {/* ── Greeting content ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <motion.div
          key={currentChar.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-center w-full max-w-xs"
        >
          {/* Avatar */}
          <Link to={`/character/${currentChar.id}`}>
            <div className="relative mx-auto mb-5 w-[72px] h-[72px]">
              <img
                src={currentChar.avatar}
                alt={currentChar.name}
                className="w-full h-full rounded-full object-cover"
                style={{
                  boxShadow: "0 0 0 2px hsl(var(--primary) / 0.32), 0 0 28px hsl(var(--primary) / 0.16)",
                }}
              />
              <div
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full btn-gradient flex items-center justify-center"
                style={{ boxShadow: "0 0 8px hsl(var(--primary) / 0.4)" }}
              >
                <Sparkles className="w-2.5 h-2.5 text-primary-foreground" />
              </div>
            </div>
          </Link>

          {/* Greeting text */}
          <h1
            className="font-display font-bold text-foreground leading-tight mb-2"
            style={{ fontSize: "clamp(1.45rem, 6vw, 2rem)" }}
          >
            Hello, I'm {currentChar.name}
          </h1>
          <p className="text-muted-foreground/65 text-sm leading-relaxed mb-7">
            {currentChar.tagline}
          </p>

          {/* Action chips */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Link to="/discover">
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-full chip chip-active text-[11px] font-semibold">
                <Compass className="w-3 h-3" />
                Explore
              </button>
            </Link>
            <Link to="/discover">
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-full chip text-[11px] font-semibold">
                <Search className="w-3 h-3" />
                Browse
              </button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* ── Bottom composer ── */}
      <div
        className="flex-shrink-0 px-4 py-3 relative z-10"
        style={{
          paddingBottom: "max(calc(env(safe-area-inset-bottom) + 12px), 14px)",
          background: "hsl(var(--card) / 0.6)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTop: "1px solid hsl(var(--border) / 0.38)",
          boxShadow: "inset 0 1px 0 hsl(var(--primary) / 0.06)",
        }}
      >
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          {/* + attachment */}
          <button
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center text-muted-foreground/70 hover:text-foreground transition-colors touch-target"
            aria-label="Attach"
          >
            <Plus className="w-[22px] h-[22px]" strokeWidth={1.8} />
          </button>

          {/* Input */}
          <div className="flex-1">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              placeholder="Ask me anything..."
              className="w-full rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 font-body focus:outline-none transition-colors"
              style={{
                background: "hsl(var(--background) / 0.5)",
                border: "1px solid hsl(var(--border) / 0.6)",
              }}
              onFocus={inputFocus.handleFocus}
              onBlur={inputFocus.handleBlur}
            />
          </div>

          {/* Send */}
          <button
            onClick={handleSend}
            className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center touch-target transition-all duration-200 active:scale-95"
            style={{
              background: input.trim()
                ? "var(--gradient-primary)"
                : "hsl(var(--muted) / 0.55)",
              boxShadow: input.trim() ? "0 3px 14px hsl(var(--primary) / 0.32)" : "none",
            }}
            aria-label="Send"
          >
            <Send
              className="w-4 h-4"
              style={{ color: input.trim() ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground) / 0.5)" }}
            />
          </button>

          {/* Mic */}
          <button
            className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground transition-all duration-200 touch-target"
            style={{
              background: "hsl(var(--muted) / 0.55)",
              border: "1px solid hsl(var(--border) / 0.4)",
            }}
            aria-label="Voice input"
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
