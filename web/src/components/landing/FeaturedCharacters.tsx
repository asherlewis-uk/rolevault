import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { characters } from "@/data/characters";
import { CharacterCard } from "@/components/CharacterCard";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const featured = characters.filter((c) => c.featured);

export function FeaturedCharacters() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 mesh-grid opacity-20 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <div className="inline-flex items-center gap-2 glass border border-primary/30 rounded-full px-3 py-1.5 mb-4">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Trending Now</span>
            </div>
            <h2 className="font-display text-4xl font-bold text-foreground">
              Featured <span className="gradient-text">Characters</span>
            </h2>
            <p className="text-muted-foreground mt-2">The minds everyone is talking to right now.</p>
          </div>
          <Link
            to="/discover"
            className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors link-underline"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((char, i) => (
            <CharacterCard key={char.id} character={char} index={i} />
          ))}
        </div>

        <div className="sm:hidden flex justify-center mt-8">
          <Link to="/discover">
            <button className="glass border border-border/60 rounded-xl px-6 py-2.5 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all duration-300 flex items-center gap-2">
              View All Characters
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
