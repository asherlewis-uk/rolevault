import { motion } from "framer-motion";
import {
  Brain, Palette, Shield, Zap, Globe, Layers
} from "lucide-react";

const heroFeature = {
  icon: Palette,
  title: "Character Creation Studio",
  description:
    "Build anything from a philosophical mentor to an epic fantasy queen. Define personality, scenario, voice, and sample dialogue — your character comes alive exactly as you imagined.",
  accent: "primary",
};

const gridFeatures = [
  {
    icon: Brain,
    title: "Advanced AI Models",
    description: "Each character runs on best-in-class language models, carefully tuned to maintain consistent personalities across long conversations.",
    accent: "primary",
  },
  {
    icon: Shield,
    title: "Safe by Design",
    description: "Comprehensive safety controls, content ratings, and real-time moderation keep RoleVault a positive space for everyone.",
    accent: "secondary",
  },
  {
    icon: Zap,
    title: "Instant Responses",
    description: "Low-latency infrastructure delivers character responses in under a second, keeping conversations fluid and deeply immersive.",
    accent: "primary",
  },
  {
    icon: Layers,
    title: "Contextual Memory",
    description: "Characters remember context from previous messages, building genuine continuity and depth over multiple sessions.",
    accent: "secondary",
  },
  {
    icon: Globe,
    title: "Discover & Share",
    description: "Explore a global community of creator-built characters. Share your own and watch them come alive for others.",
    accent: "primary",
  },
];

export function Features() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Ambient */}
      <div className="absolute top-1/2 left-0 w-1/3 h-80 bg-radial-violet opacity-15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-1/3 h-80 bg-radial-crimson opacity-12 blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Built for <span className="gradient-text">deep connection</span>
          </h2>
          <p className="text-muted-foreground text-base max-w-lg leading-relaxed">
            Every feature exists to make your conversations more meaningful, more immersive, and more memorable.
          </p>
        </motion.div>

        {/* Hero feature — dominant, spans wider */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-5"
        >
          <div className="group panel rounded-2xl p-6 sm:p-8 card-lift cursor-default relative overflow-hidden">
            {/* Ambient inner glow */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-radial-violet opacity-30 pointer-events-none rounded-full" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-start gap-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 icon-box-primary">
                <heroFeature.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-3">
                  {heroFeature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  {heroFeature.description}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Secondary feature grid — 2/3 column support */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gridFeatures.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="group panel rounded-2xl p-5 card-lift cursor-default"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${
                feature.accent === "primary" ? "icon-box-primary" : "icon-box-secondary"
              }`}>
                <feature.icon className="w-4 h-4" />
              </div>
              <h3 className="font-display text-sm font-semibold text-foreground mb-1.5">
                {feature.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
