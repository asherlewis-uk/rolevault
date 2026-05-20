import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MessageCircle, Heart } from "lucide-react";
import { type Character } from "@/data/characters";
import { cn } from "@/lib/utils";

interface CharacterCardProps {
  character: Character;
  className?: string;
  index?: number;
  showFavouriteButton?: boolean;
  isFavourited?: boolean;
  onToggleFavourite?: (e: React.MouseEvent) => void;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

/** Returns CSS hsl vars for each category's spectral accent color */
function getCategorySpectral(category: string): {
  edgeColor: string;
  glowColor: string;
  borderColor: string;
} {
  const cat = category.toLowerCase();
  if (cat === "companions")  return { edgeColor: "hsl(var(--spectral-violet))", glowColor: "hsl(var(--spectral-violet) / 0.18)", borderColor: "hsl(var(--spectral-violet) / 0.3)" };
  if (cat === "educational") return { edgeColor: "hsl(var(--spectral-cyan))",   glowColor: "hsl(var(--spectral-cyan) / 0.18)",   borderColor: "hsl(var(--spectral-cyan) / 0.3)" };
  if (cat === "roleplay")    return { edgeColor: "hsl(var(--spectral-orange))", glowColor: "hsl(var(--spectral-orange) / 0.15)", borderColor: "hsl(var(--spectral-orange) / 0.28)" };
  if (cat === "fantasy")     return { edgeColor: "hsl(var(--spectral-pink))",   glowColor: "hsl(var(--spectral-pink) / 0.16)",   borderColor: "hsl(var(--spectral-pink) / 0.28)" };
  if (cat === "wellness")    return { edgeColor: "hsl(var(--spectral-green))",  glowColor: "hsl(var(--spectral-green) / 0.16)",  borderColor: "hsl(var(--spectral-green) / 0.28)" };
  // default: violet
  return { edgeColor: "hsl(var(--spectral-violet))", glowColor: "hsl(var(--spectral-violet) / 0.18)", borderColor: "hsl(var(--spectral-violet) / 0.3)" };
}

export function CharacterCard({
  character,
  className,
  index = 0,
  showFavouriteButton = false,
  isFavourited = false,
  onToggleFavourite,
}: CharacterCardProps) {
  const spectral = getCategorySpectral(character.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.055, duration: 0.35, ease: "easeOut" }}
    >
      <Link to={`/character/${character.id}`}>
        <div
          className={cn("group relative overflow-hidden rounded-xl cursor-pointer card-lift", className)}
          style={{
            background: "hsl(var(--card) / 0.65)",
            border: `1px solid hsl(var(--border) / 0.4)`,
            transition: "border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = spectral.borderColor;
            el.style.boxShadow = `0 0 18px ${spectral.glowColor}, 0 8px 32px hsl(236 22% 2% / 0.55)`;
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = "hsl(var(--border) / 0.4)";
            el.style.boxShadow = "none";
          }}
        >
          {/* ── Spectral top edge-light (always visible, category color) ── */}
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none z-10"
            style={{
              background: `linear-gradient(90deg, transparent 5%, ${spectral.edgeColor} 40%, ${spectral.edgeColor} 60%, transparent 95%)`,
              opacity: 0.55,
            }}
          />
          {/* Hover-amplified top edge glow */}
          <div
            className="absolute top-0 left-0 right-0 h-6 pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: `linear-gradient(to bottom, ${spectral.glowColor}, transparent)`,
            }}
          />

          {/* Avatar */}
          <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
            <img
              src={character.avatar}
              alt={character.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0"
              style={{ background: "linear-gradient(to top, hsl(var(--background) / 0.95) 0%, hsl(var(--background) / 0.35) 45%, transparent 70%)" }} />

            {/* Top badges */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: `${spectral.glowColor}`,
                  border: `1px solid ${spectral.borderColor}`,
                  color: spectral.edgeColor,
                  backdropFilter: "blur(8px)",
                }}>
                {character.category}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: "hsl(var(--card) / 0.8)",
                  border: "1px solid hsl(var(--border) / 0.6)",
                  color: "hsl(var(--muted-foreground))",
                  backdropFilter: "blur(8px)",
                }}>
                {character.rating}
              </span>
            </div>

            {/* Favourite heart button overlay */}
            {showFavouriteButton && (
              <button
                onClick={onToggleFavourite}
                className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center z-20 transition-all duration-200"
                style={{
                  background: isFavourited
                    ? "hsl(var(--spectral-pink) / 0.85)"
                    : "hsl(var(--card) / 0.75)",
                  border: isFavourited
                    ? "1.5px solid hsl(var(--spectral-pink) / 0.6)"
                    : "1.5px solid hsl(var(--border) / 0.5)",
                  backdropFilter: "blur(8px)",
                  boxShadow: isFavourited
                    ? "0 0 10px hsl(var(--spectral-pink) / 0.35)"
                    : "none",
                }}
              >
                <Heart
                  className="w-3.5 h-3.5 transition-all duration-200"
                  style={{
                    color: isFavourited ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                    fill: isFavourited ? "hsl(var(--primary-foreground))" : "none",
                  }}
                />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-3.5">
            <h3 className="font-display font-bold text-foreground text-sm mb-0.5 truncate transition-colors duration-200 group-hover:text-primary">
              {character.name}
            </h3>
            <p className="text-muted-foreground/70 text-xs line-clamp-2 leading-relaxed mb-3">
              {character.tagline}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-3">
              {character.tags.slice(0, 2).map((tag) => (
                <span key={tag}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    background: "hsl(var(--accent) / 0.7)",
                    color: "hsl(var(--muted-foreground))",
                    border: "1px solid hsl(var(--border) / 0.5)",
                  }}>
                  {tag}
                </span>
              ))}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between"
              style={{ paddingTop: "0.5rem", borderTop: "1px solid hsl(var(--border) / 0.4)" }}>
              <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                <MessageCircle className="w-3 h-3" />
                <span>{formatCount(character.chats)}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                <Heart className="w-3 h-3" />
                <span>{formatCount(character.likes)}</span>
              </div>
              <span className="text-[10px] text-muted-foreground/50">by {character.creator}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
