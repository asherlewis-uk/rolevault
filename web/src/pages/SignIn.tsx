import { useState } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, Sparkles, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { useAuth } from "@/context/AuthContext";
import { useInputFocus } from "@/hooks/useInputFocus";

export default function SignIn() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();
  const emailFocus = useInputFocus();
  const passFocus = useInputFocus();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden">

      {/* Left — Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative">
        <div className="absolute inset-0 bg-background mesh-grid opacity-40" />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-radial-violet opacity-20 blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-md relative z-10"
        >
          <Link to="/" className="flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-xl btn-gradient flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl gradient-text">RoleVault</span>
          </Link>

          <h1 className="font-display text-3xl font-bold text-foreground mb-1.5">Welcome back</h1>
          <p className="text-muted-foreground text-sm mb-8">Sign in to continue your conversations.</p>

          {error && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-sm"
              style={{ background: "hsl(var(--destructive) / 0.08)", border: "1px solid hsl(var(--destructive) / 0.25)", color: "hsl(var(--destructive))" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Email */}
            <div className="relative glow-focus rounded-xl">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 z-10" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                className="w-full rounded-xl py-3 pl-10 pr-4 text-sm font-body surface-inset"
                onFocus={emailFocus.handleFocus}
                onBlur={emailFocus.handleBlur}
              />
            </div>

            {/* Password */}
            <div className="relative glow-focus rounded-xl">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 z-10" />
              <input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Password" required
                className="w-full rounded-xl py-3 pl-10 pr-11 text-sm font-body surface-inset"
                onFocus={passFocus.handleFocus}
                onBlur={passFocus.handleBlur}
              />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors z-10">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                <input type="checkbox" className="rounded accent-primary" />
                Remember me
              </label>
              <span className="text-muted-foreground/50 text-xs">Forgot password?</span>
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-gradient rounded-xl py-3 font-display font-semibold text-primary-foreground flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed mt-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:text-primary/80 transition-colors font-medium">Create one free</Link>
          </p>
          <p className="text-center text-[10px] text-muted-foreground/40 mt-4">
            By signing in you agree to our{" "}
            <Link to="/settings/privacy" className="underline hover:text-muted-foreground transition-colors">Terms</Link>
            {" "}and{" "}
            <Link to="/settings/privacy" className="underline hover:text-muted-foreground transition-colors">Privacy Policy</Link>.
          </p>
        </motion.div>
      </div>

      {/* Right — Visual panel (desktop only) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <img src={heroBg} alt="RoleVault" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to left, transparent 20%, hsl(var(--background) / 0.5) 100%)" }} />
        {/* Overlay content */}
        <div className="relative z-10 flex flex-col justify-center items-center p-16 text-center w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="max-w-sm"
          >
            <div className="w-12 h-12 rounded-2xl btn-gradient flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground mb-4 leading-snug">
              Infinite minds,<br />
              <span className="gradient-text">waiting to meet you.</span>
            </h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
              Thousands of unique AI characters ready for deep, meaningful conversations.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
iv>
    </div>
  );
}
