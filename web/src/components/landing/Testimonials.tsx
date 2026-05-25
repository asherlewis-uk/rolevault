import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import charLyra from "@/assets/char-lyra.jpg";
import charSage from "@/assets/char-sage.jpg";
import charNova from "@/assets/char-nova.jpg";

const testimonials = [
  {
    name: "Mira Chen",
    handle: "@mira_creates",
    avatar: charLyra,
    text:
      "I've tried every AI chat platform out there. RoleVault is the only one where the characters feel genuinely *alive*. Lyra helped me work through creative blocks I'd had for months.",
    role: "Screenwriter",
  },
  {
    name: "James Okafor",
    handle: "@jokaf",
    avatar: charSage,
    text:
      "The character creation studio is incredible. I built a historical mentor character for my students and they're more engaged in history class than they've ever been. Wild.",
    role: "High School Teacher",
  },
  {
    name: "Sasha Volkov",
    handle: "@sasha_v",
    avatar: charNova,
    text:
      "Rex Noir got me through an entire mystery novel outline in one weekend. The depth of roleplay is unlike anything else. I'm completely hooked.",
    role: "Novelist",
  },
  {
    name: "Priya Nair",
    handle: "@priya_codes",
    avatar: charLyra,
    text:
      "I use The Sage every day for philosophical debates. It's legitimately changed how I think. The long-term memory feature is a game changer — it remembers where we left off.",
    role: "Product Designer",
  },
  {
    name: "Tom Wheeler",
    handle: "@twheels",
    avatar: charSage,
    text:
      "Created my own character, published it, and 50K people have chatted with it now. The community here is incredible. Best creative decision I've made this year.",
    role: "Indie Game Developer",
  },
  {
    name: "Yuki Tanaka",
    handle: "@yukitanaka",
    avatar: charNova,
    text:
      "The interface is so beautiful it's actually motivating to use. Every conversation feels like stepping into a film. The design team knocked it out of the park.",
    role: "UX Researcher",
  },
];

export function Testimonials() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 mesh-grid opacity-15 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Loved by <span className="gradient-text">millions</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Real stories from the people who use RoleVault every day.
          </p>
        </motion.div>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.handle}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="break-inside-avoid panel rounded-2xl p-5 border border-border/50 card-lift"
            >
              <Quote className="w-5 h-5 text-primary/50 mb-3" />
              <p className="text-foreground/85 text-sm leading-relaxed mb-4">{t.text}</p>
              <div className="flex items-center gap-3">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-9 h-9 rounded-full object-cover avatar-ring"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
