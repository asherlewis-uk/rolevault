import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 relative">
      <div className="absolute inset-0 mesh-grid opacity-25 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center relative z-10"
      >
        <div className="w-12 h-12 rounded-2xl btn-gradient flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-6 h-6 text-primary-foreground" />
        </div>
        <h1 className="font-display text-7xl font-bold gradient-text mb-3">404</h1>
        <p className="text-muted-foreground text-lg mb-2">This page doesn't exist</p>
        <p className="text-muted-foreground/50 text-sm mb-8 max-w-sm">
          The page <code className="text-xs px-1.5 py-0.5 rounded" style={{ background: "hsl(var(--accent))" }}>{location.pathname}</code> couldn't be found.
        </p>
        <Link to="/">
          <button className="btn-gradient rounded-xl px-6 py-3 font-display font-semibold text-primary-foreground text-sm">
            Return Home
          </button>
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
