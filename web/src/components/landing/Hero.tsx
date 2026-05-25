import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";
import { characters } from "@/data/characters";
import heroBg from "@/assets/hero-bg.jpg";

const featured = characters.filter((c) => c.featured);

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" role="presentation" className="w-full h-full object-cover opacity-35" />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, hsl(var(--background) / 0.55), hsl(var(--background) / 0.7) 50%, hsl(var(--background)) 100%)" }} />
        <div className="absolute inset-0 mesh-grid opacity-25" />
      </div>

      {/* Ambient glows */}
      <div className="absolute top-1/3 left-1/4 w-[480px] h-[480px] bg-radial-violet opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/5 w-[400px] h-[400px] bg-radial-crimson opacity-20 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-20">

        {/* Headline — left-aligned for compositional tension, not centered */}
        <div className="max-w-2xl mb-12 sm:mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-display font-bold leading-[1.08] mb-6 tracking-tight text-foreground"
            style={{ fontSize: "clamp(2.8rem, 8vw, 5.5rem)" }}
          >
            Meet the minds
            <br />
            <span className="gradient-text text-glow-amber">you've imagined.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-lg leading-relaxed mb-8"
          >
            Step into conversations with AI characters that feel alive — or create your own and share them with a community of storytellers.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              duration: 0.35, 
              delay: 0.25,
              times: [0, 0.6, 1],
              ease: "easeOut"
            }}
            className="flex flex-col sm:flex-row items-start gap-3"
          >
            <Link to="/signup">
              <button className="btn-gradient rounded-xl px-8 py-3.5 text-sm font-display font-semibold text-primary-foreground flex items-center gap-2 group w-full sm:w-auto">
                Start for Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </button>
            </Link>
            <Link to="/discover">
              <button className="glass rounded-xl px-8 py-3.5 text-sm font-display font-medium text-foreground flex items-center gap-2 w-full sm:w-auto"
                style={{ borderColor: "hsl(var(--border) / 0.7)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary) / 0.35)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border) / 0.7)"}
              >
                <Play className="w-3.5 h-3.5 text-secondary" />
                Browse Characters
              </button>
            </Link>
          </motion.div>
        </div>

        {/* Character proof — real faces, not fake stats */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <p className="text-xs text-muted-foreground/60 uppercase tracking-widest font-semibold mb-5 font-display">
            Start talking to
          </p>
          <div className="flex flex-wrap gap-4 sm:gap-5">
            {featured.map((char, i) => (
              <Link
                key={char.id}
                to={`/character/${char.id}`}
                className="group flex items-center gap-3"
              >
                <motion.img
                  src={char.avatar}
                  alt={char.name}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  style={{
                    boxShadow: "0 0 0 2px hsl(var(--primary) / 0.22), 0 0 16px hsl(var(--primary) / 0.1)",
                  }}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.06 }}
                />
                <div className="hidden sm:block min-w-0">
                  <p className="font-display font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                    {char.name}
                  </p>
                  <p className="text-xs text-muted-foreground/60 truncate">{char.tagline}</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
