import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Play, Sparkles, Zap } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import charLyra from "@/assets/char-lyra.jpg";
import charSage from "@/assets/char-sage.jpg";
import charNova from "@/assets/char-nova.jpg";

const stats = [
  { value: "50M+", label: "Conversations" },
  { value: "10K+", label: "Characters" },
  { value: "2M+", label: "Creators" },
  { value: "4.9★", label: "App Rating" },
];

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-35" />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, hsl(var(--background) / 0.55), hsl(var(--background) / 0.7) 50%, hsl(var(--background)) 100%)" }} />
        <div className="absolute inset-0 mesh-grid opacity-25" />
      </div>

      {/* Ambient glows */}
      <div className="absolute top-1/3 left-1/4 w-[480px] h-[480px] bg-radial-violet opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/5 w-[400px] h-[400px] bg-radial-cyan opacity-20 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-8"
          style={{
            background: "hsl(var(--primary) / 0.1)",
            border: "1px solid hsl(var(--primary) / 0.25)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground tracking-wide">
            Next-Generation AI Character Platform
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-primary px-1.5 py-0.5 rounded-full"
            style={{ background: "hsl(var(--primary) / 0.15)" }}>
            <Zap className="w-2.5 h-2.5" /> New
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-display font-bold leading-[1.08] mb-6 tracking-tight"
          style={{ fontSize: "clamp(2.8rem, 8vw, 5.5rem)" }}
        >
          <span className="text-foreground">Meet the minds</span>
          <br />
          <span className="gradient-text text-glow-violet">you've imagined.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed"
        >
          RoleVault is where conversation becomes art. Chat with thousands of unique AI characters — or create your own and share them with the world.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16"
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

        {/* Social proof avatars */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col items-center gap-3 mb-16"
        >
          <div className="flex items-center">
            {[charLyra, charSage, charNova].map((src, i) => (
              <motion.img
                key={i}
                src={src}
                alt=""
                className="w-10 h-10 rounded-full object-cover border-2"
                style={{
                  marginLeft: i > 0 ? "-10px" : 0,
                  zIndex: 3 - i,
                  borderColor: "hsl(var(--background))",
                  boxShadow: "0 0 0 1px hsl(var(--primary) / 0.3)",
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.08 }}
              />
            ))}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-display font-bold text-primary border-2"
              style={{
                marginLeft: "-10px",
                background: "hsl(var(--card) / 0.9)",
                borderColor: "hsl(var(--background))",
                backdropFilter: "blur(8px)",
                zIndex: 0,
              }}
            >
              10K+
            </div>
          </div>
          <p className="text-xs text-muted-foreground/70">
            Join <span className="text-foreground font-medium">2M+ users</span> already in conversation
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.07 }}
              className="panel rounded-xl p-4 text-center"
              style={{ backdropFilter: "blur(16px)" }}
            >
              <p className="font-display text-xl font-bold gradient-text mb-0.5">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
