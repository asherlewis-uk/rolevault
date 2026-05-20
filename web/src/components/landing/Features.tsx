import { motion } from "framer-motion";
import {
  Brain, Palette, Shield, Zap, Globe, Layers, Sparkles
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Advanced AI Models",
    description: "Each character runs on best-in-class language models, carefully tuned to maintain consistent personalities across long conversations.",
    accent: "primary",
  },
  {
    icon: Palette,
    title: "Character Creation Studio",
    description: "Build anything from a philosophical mentor to an epic fantasy queen. Our studio gives you full creative control over personality and tone.",
    accent: "secondary",
  },
  {
    icon: Shield,
    title: "Safe by Design",
    description: "Comprehensive safety controls, content ratings, and real-time moderation keep RoleVault a positive space for everyone.",
    accent: "primary",
  },
  {
    icon: Zap,
    title: "Instant Responses",
    description: "Low-latency infrastructure delivers character responses in under a second, keeping conversations fluid and deeply immersive.",
    accent: "secondary",
  },
  {
    icon: Globe,
    title: "Discover & Share",
    description: "Explore a global community of creator-built characters. Share your own creations and watch them come alive for others.",
    accent: "primary",
  },
  {
    icon: Layers,
    title: "Contextual Memory",
    description: "Characters remember context from previous messages, building genuine continuity and depth over multiple sessions.",
    accent: "secondary",
  },
];

export function Features() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Ambient */}
      <div className="absolute top-1/2 left-0 w-1/3 h-80 bg-radial-violet opacity-15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-1/3 h-80 bg-radial-cyan opacity-12 blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-4"
            style={{
              background: "hsl(var(--primary) / 0.08)",
              border: "1px solid hsl(var(--primary) / 0.2)",
            }}>
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground">Platform Capabilities</span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Built for <span className="gradient-text">deep connection</span>
          </h2>
          <p className="text-muted-foreground text-base max-w-lg mx-auto leading-relaxed">
            Every feature exists to make your conversations more meaningful, more immersive, and more memorable.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="group panel rounded-2xl p-6 card-lift cursor-default"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                feature.accent === "primary" ? "icon-box-primary" : "icon-box-cyan"
              }`}>
                <feature.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display text-base font-semibold text-foreground mb-2">
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
