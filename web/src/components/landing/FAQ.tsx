import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Is RoleVault free to use?",
    a: "Yes — our Explorer plan is completely free and includes 100 messages per day and access to 50+ characters. Paid plans unlock unlimited messages, all characters, and advanced features.",
  },
  {
    q: "Can I create my own AI characters?",
    a: "Absolutely. Our Character Creation Studio lets you define a character's name, personality, scenario, opening greeting, and sample dialogue. You can keep your character private or publish it for the community to discover.",
  },
  {
    q: "Are conversations private?",
    a: "Your conversations are private by default and are not shared with other users. We encrypt all chat data in transit and at rest. You can review and delete your conversation history at any time from your account settings.",
  },
  {
    q: "How does the AI stay in character?",
    a: "Each character is powered by a personality model trained on the creator's description. Our AI system continuously evaluates responses for character consistency and applies corrections in real time. Long-term memory also helps characters build context over multiple sessions.",
  },
  {
    q: "What content is allowed on RoleVault?",
    a: "RoleVault supports characters rated G through PG-13 on its public platform. All characters are reviewed against our community guidelines before publishing. Explicit content is not permitted on our platform.",
  },
  {
    q: "Can I earn money from my characters?",
    a: "We're building a creator monetization program. Early-access creators on our Luminary plan will be first in line. Sign up for our newsletter to hear about updates.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-radial-violet opacity-15 blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Frequently asked <span className="gradient-text">questions</span>
          </h2>
          <p className="text-muted-foreground">Everything you need to know before diving in.</p>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={`panel rounded-2xl border transition-all duration-300 overflow-hidden ${
                open === i ? "border-primary/40 shadow-glow-primary" : "border-border/50"
              }`}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full px-6 py-5 flex items-center justify-between text-left gap-4"
              >
                <span
                  className={`font-display font-semibold text-sm sm:text-base transition-colors duration-300 ${
                    open === i ? "text-primary" : "text-foreground"
                  }`}
                >
                  {faq.q}
                </span>
                <ChevronDown
                  className={`w-5 h-5 flex-shrink-0 text-muted-foreground transition-transform duration-300 ${
                    open === i ? "rotate-180 text-primary" : ""
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <p className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/30 pt-4">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
