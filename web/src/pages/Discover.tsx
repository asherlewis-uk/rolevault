import { useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, TrendingUp, Sparkles, X, Flame, Star, Clock, Compass, Home, PlusCircle, User } from "lucide-react";
import { Link } from "react-router-dom";
import { characters, categories, trendingTags } from "@/data/characters";
import { CharacterCard } from "@/components/CharacterCard";
import { AppNavLink } from "@/components/AppNavLink";
import { useFavourites } from "@/hooks/useFavourites";
import { useInputFocus } from "@/hooks/useInputFocus";

/** Category → spectral edge color */
function getCategorySpectral(category: string) {
  const cat = category.toLowerCase();
  if (cat === "companions")  return { edge: "hsl(var(--spectral-gold))",    glow: "hsl(var(--spectral-gold) / 0.18)",    border: "hsl(var(--spectral-gold) / 0.32)" };
  if (cat === "educational") return { edge: "hsl(var(--spectral-emerald))",  glow: "hsl(var(--spectral-emerald) / 0.18)",  border: "hsl(var(--spectral-emerald) / 0.32)" };
  if (cat === "roleplay")    return { edge: "hsl(var(--spectral-amber))",   glow: "hsl(var(--spectral-amber) / 0.15)",   border: "hsl(var(--spectral-amber) / 0.28)" };
  if (cat === "fantasy")     return { edge: "hsl(var(--spectral-rose))",    glow: "hsl(var(--spectral-rose) / 0.16)",    border: "hsl(var(--spectral-rose) / 0.28)" };
  if (cat === "wellness")    return { edge: "hsl(var(--spectral-gold))",    glow: "hsl(var(--spectral-gold) / 0.16)",    border: "hsl(var(--spectral-gold) / 0.28)" };
  return { edge: "hsl(var(--spectral-gold))", glow: "hsl(var(--spectral-gold) / 0.18)", border: "hsl(var(--spectral-gold) / 0.3)" };
}

const navItems = [
  { to: "/", icon: Home, label: "Home", end: true as const },
  { to: "/discover", icon: Compass, label: "Discover" },
  { to: "/create", icon: PlusCircle, label: "Create" },
  { to: "/profile", icon: User, label: "Profile" },
];

const sortOptions = [
  { id: "trending", label: "Trending", icon: Flame },
  { id: "top", label: "Top Rated", icon: Star },
  { id: "new", label: "New", icon: Clock },
];

export default function Discover() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeSort, setActiveSort] = useState("trending");
  const { isFavourite, toggleFavourite } = useFavourites();
  const searchFocus = useInputFocus({ borderFocus: "hsl(var(--primary) / 0.45)", borderBlur: "hsl(var(--border) / 0.6)" });

  const filtered = characters.filter((c) => {
    const matchesCategory =
      activeCategory === "all" || c.category.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tagline.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags =
      activeTags.length === 0 || activeTags.every((t) => c.tags.includes(t));
    return matchesCategory && matchesSearch && matchesTags;
  });

  const toggleTag = (tag: string) =>
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const featuredChars = characters.filter(c => c.featured);

  return (
    <div className="min-h-screen bg-background flex">

      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden lg:flex w-60 flex-col fixed h-full z-20"
        style={{ background: "hsl(var(--sidebar-background))", borderRight: "1px solid hsl(var(--sidebar-border))" }}>

        <div className="px-5 py-5" style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}>
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl btn-gradient flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-base gradient-text">RoleVault</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <AppNavLink
              key={to}
              to={to}
              end={end}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-sidebar-accent/60 transition-all duration-200 text-sm font-medium"
              activeClassName="bg-sidebar-accent text-foreground border-l-2 border-primary"
            >
              <Icon className="w-4 h-4" />
              {label}
            </AppNavLink>
          ))}
        </nav>

        {/* Pro upgrade card */}
        <div className="p-3 m-3 rounded-xl" style={{
          background: "hsl(var(--primary) / 0.08)",
          border: "1px solid hsl(var(--primary) / 0.18)",
        }}>
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs font-semibold text-foreground">Unlock Luminary</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Access all characters with unlimited conversations.
          </p>
          <Link to="/signin">
            <button className="w-full btn-gradient rounded-lg py-1.5 text-xs font-semibold text-primary-foreground">
              Upgrade to Pro
            </button>
          </Link>
        </div>

        <div className="px-3 py-3" style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}>
          <p className="text-[10px] text-muted-foreground/40 text-center">
            © 2025 RoleVault Inc.
          </p>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 lg:ml-60 pb-8">

        {/* Top bar */}
        <div className="sticky top-0 z-10 px-5 py-3.5"
          style={{
            background: "hsl(var(--card) / 0.75)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid hsl(var(--border) / 0.45)",
          }}>
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 relative glow-focus rounded-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search characters, creators, topics…"
                className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm surface-inset"
                onFocus={searchFocus.handleFocus}
                onBlur={searchFocus.handleBlur}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort pills */}
            <div className="hidden sm:flex items-center gap-1.5">
              {sortOptions.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveSort(id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    activeSort === id
                      ? "bg-primary/15 border border-primary/35 text-primary"
                      : "glass text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>

            <button className="glass rounded-xl p-2.5 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-5 py-7 space-y-8">

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  activeCategory === cat.id
                    ? "chip chip-active"
                    : "chip"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Featured spotlight (only on "all" with no search) */}
          {activeCategory === "all" && searchQuery === "" && activeTags.length === 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-primary" />
                  <h2 className="font-display font-bold text-foreground text-base">Featured This Week</h2>
                </div>
                <span className="text-xs text-muted-foreground">Curated by RoleVault</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {featuredChars.map((char, i) => {
                  const sp = getCategorySpectral(char.category);
                  return (
                    <motion.div
                      key={char.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                    >
                      <Link to={`/character/${char.id}`}>
                        <div
                          className="relative overflow-hidden rounded-xl group cursor-pointer card-lift"
                          style={{
                            background: "hsl(var(--card) / 0.6)",
                            border: `1px solid hsl(var(--border) / 0.4)`,
                            transition: "border-color 0.22s ease, box-shadow 0.22s ease, transform 0.22s cubic-bezier(0.34,1.56,0.64,1)",
                          }}
                          onMouseEnter={e => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.borderColor = sp.border;
                            el.style.boxShadow = `0 0 20px ${sp.glow}, 0 8px 32px hsl(236 22% 2% / 0.55)`;
                          }}
                          onMouseLeave={e => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.borderColor = "hsl(var(--border) / 0.4)";
                            el.style.boxShadow = "none";
                          }}
                        >
                          {/* Spectral top edge-light */}
                          <div
                            className="absolute top-0 left-0 right-0 h-px pointer-events-none z-10"
                            style={{
                              background: `linear-gradient(90deg, transparent 5%, ${sp.edge} 40%, ${sp.edge} 60%, transparent 95%)`,
                              opacity: 0.6,
                            }}
                          />
                          {/* Hover top glow bloom */}
                          <div
                            className="absolute top-0 left-0 right-0 h-8 pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            style={{ background: `linear-gradient(to bottom, ${sp.glow}, transparent)` }}
                          />

                          <div className="aspect-[4/3] relative overflow-hidden">
                            <img
                              src={char.avatar}
                              alt={char.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0"
                              style={{ background: "linear-gradient(to top, hsl(var(--background) / 0.92) 0%, transparent 55%)" }} />
                            <div className="absolute bottom-3 left-3 right-3">
                              <p className="font-display font-bold text-foreground text-sm">{char.name}</p>
                              <p className="text-xs text-muted-foreground/80 truncate">{char.tagline}</p>
                            </div>
                            <div className="absolute top-2.5 right-2.5">
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                                style={{
                                  background: sp.glow,
                                  border: `1px solid ${sp.border}`,
                                  color: sp.edge,
                                  backdropFilter: "blur(8px)",
                                }}
                              >
                                Featured
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trending tags */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
              <h3 className="section-label">Trending Tags</h3>
              {activeTags.length > 0 && (
                <button
                  onClick={() => setActiveTags([])}
                  className="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <X className="w-2.5 h-2.5" /> Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {trendingTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`chip ${activeTags.includes(tag) ? "chip-cyan" : ""}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Results grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-primary" />
                <h2 className="font-display font-bold text-foreground text-base">
                  {activeCategory === "all" ? "All Characters" : categories.find(c => c.id === activeCategory)?.label}
                </h2>
                <span className="text-xs text-muted-foreground/60">({filtered.length})</span>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <Sparkles className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-foreground font-medium mb-2">No characters found</p>
                <p className="text-sm text-muted-foreground/60">Try different filters or search terms</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {filtered.map((char, i) => (
                  <CharacterCard
                    key={char.id}
                    character={char}
                    index={i}
                    showFavouriteButton
                    isFavourited={isFavourite(char.id)}
                    onToggleFavourite={(e) => { e.preventDefault(); toggleFavourite(char.id); }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

    </div>
  );
}
