import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Heart, ArrowLeft, Sparkles } from "lucide-react";
import { useFavourites } from "@/hooks/useFavourites";
import { characters } from "@/data/characters";
import { CharacterCard } from "@/components/CharacterCard";

export default function Favourites() {
  const { favouriteIds, toggleFavourite } = useFavourites();

  const favouriteChars = favouriteIds
    .map((id) => characters.find((c) => c.id === id))
    .filter(Boolean) as typeof characters;

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 opacity-[0.06] blur-3xl bg-radial-violet" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 opacity-[0.04] blur-3xl bg-radial-cyan" />
        <div className="absolute inset-0 mesh-grid opacity-[0.03]" />
      </div>

      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 flex items-center gap-3"
        style={{
          height: "56px",
          background: "hsl(var(--card) / 0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid hsl(var(--border) / 0.4)",
        }}
      >
        <Link
          to="/"
          className="w-9 h-9 flex items-center justify-center text-foreground/70 hover:text-foreground transition-colors -ml-1 flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.8} />
        </Link>

        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: "hsl(var(--spectral-pink) / 0.15)",
              border: "1px solid hsl(var(--spectral-pink) / 0.3)",
            }}
          >
            <Heart
              className="w-3.5 h-3.5 fill-current"
              style={{ color: "hsl(var(--spectral-pink))" }}
            />
          </div>
          <h1 className="font-display font-bold text-foreground text-base">Favourites</h1>
          {favouriteChars.length > 0 && (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: "hsl(var(--spectral-pink) / 0.12)",
                color: "hsl(var(--spectral-pink))",
                border: "1px solid hsl(var(--spectral-pink) / 0.25)",
              }}
            >
              {favouriteChars.length}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-2xl mx-auto relative z-10">
        {favouriteChars.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{
                background: "hsl(var(--spectral-pink) / 0.08)",
                border: "1.5px solid hsl(var(--spectral-pink) / 0.2)",
              }}
            >
              <Heart
                className="w-8 h-8"
                style={{ color: "hsl(var(--spectral-pink) / 0.5)" }}
              />
            </div>
            <h2 className="font-display font-bold text-foreground text-xl mb-2">No favourites yet</h2>
            <p className="text-muted-foreground/60 text-sm leading-relaxed max-w-xs mb-8">
              Heart a character from their profile or the Discover page to pin them here for quick access.
            </p>
            <Link to="/discover">
              <button
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-display font-semibold text-sm transition-all duration-200"
                style={{
                  background: "hsl(var(--primary) / 0.1)",
                  border: "1px solid hsl(var(--primary) / 0.3)",
                  color: "hsl(var(--primary))",
                }}
              >
                <Sparkles className="w-4 h-4" />
                Browse Characters
              </button>
            </Link>
          </motion.div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground/50 mb-5 font-medium">
              {favouriteChars.length} character{favouriteChars.length !== 1 ? "s" : ""} hearted
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {favouriteChars.map((char, i) => (
                <CharacterCard
                  key={char.id}
                  character={char}
                  index={i}
                  showFavouriteButton
                  isFavourited={true}
                  onToggleFavourite={() => toggleFavourite(char.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
