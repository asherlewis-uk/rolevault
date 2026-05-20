import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sparkles, LogOut, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const navLinks = [
  { label: "Discover", to: "/discover" },
  { label: "Create", to: "/create" },
  { label: "Pricing", to: "/profile" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setMobileOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "glass border-b border-border/40 shadow-card" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center group-hover:shadow-glow-violet transition-all duration-300">
            <Sparkles className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl gradient-text">RoleVault</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors link-underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/profile"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
              >
                <User className="w-4 h-4" />
                {user.displayName ?? user.email?.split("@")[0] ?? "Profile"}
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 glass border border-border/60 rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-300"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/signin"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
              >
                Sign In
              </Link>
              <Link to="/signup">
                <button className="btn-gradient px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground">
                  Get Started Free
                </button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-border/40"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                {user ? (
                  <>
                    <Link to="/profile" onClick={() => setMobileOpen(false)}>
                      <button className="w-full flex items-center justify-center gap-2 glass border border-border/60 rounded-xl py-2.5 text-sm font-medium text-muted-foreground">
                        <User className="w-4 h-4" />
                        Profile
                      </button>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center justify-center gap-2 glass border border-border/60 rounded-xl py-2.5 text-sm font-medium text-muted-foreground"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/signin" onClick={() => setMobileOpen(false)}>
                      <button className="w-full glass border border-border/60 rounded-xl py-2.5 text-sm font-medium text-muted-foreground">
                        Sign In
                      </button>
                    </Link>
                    <Link to="/signup" onClick={() => setMobileOpen(false)}>
                      <button className="w-full btn-gradient rounded-xl py-2.5 text-sm font-semibold text-primary-foreground">
                        Get Started Free
                      </button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
