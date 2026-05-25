import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Twitter, Github, MessageCircle } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Discover Characters", to: "/discover" },
    { label: "Create a Character", to: "/create" },
  ],
  Support: [
    { label: "Privacy Policy", to: "/settings/privacy" },
    { label: "Terms of Service", to: "/settings/privacy" },
    { label: "Community Guidelines", to: "/settings/privacy" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border/40 pt-20 pb-10 relative overflow-hidden">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-64 bg-radial-violet opacity-10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* CTA Banner */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="panel rounded-3xl p-8 sm:p-12 border border-primary/20 text-center mb-20 relative overflow-hidden inner-glow-primary"
        >
          <div className="absolute inset-0 bg-radial-violet opacity-20 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Ready to step into another mind?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
              Join millions of users having the most meaningful AI conversations of their lives.
            </p>
            <Link to="/signup">
              <button className="btn-gradient rounded-xl px-8 py-4 text-base font-display font-semibold text-primary-foreground inline-flex items-center gap-2 group">
                <Sparkles className="w-4 h-4" />
                Create your free account
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </Link>
          </div>
        </motion.div>

        {/* Links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg gradient-text">RoleVault</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              The premier platform for AI character conversations. Meet minds beyond your own.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" className="w-8 h-8 glass rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-all duration-300">
                <Twitter className="w-3.5 h-3.5" />
              </a>
              <a href="#" className="w-8 h-8 glass rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-all duration-300">
                <Github className="w-3.5 h-3.5" />
              </a>
              <a href="#" className="w-8 h-8 glass rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-all duration-300">
                <MessageCircle className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-display text-sm font-semibold text-foreground mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors link-underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border/40">
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} RoleVault Inc. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground/40">
            Built with imagination. Powered by intelligence.
          </p>
        </div>
      </div>
    </footer>
  );
}
