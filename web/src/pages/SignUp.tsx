import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, Sparkles, ArrowRight, Check, AlertCircle, Loader2 } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { useAuth } from "@/context/AuthContext";
import { useInputFocus } from "@/hooks/useInputFocus";

const perks = [
  "Chat with thousands of unique AI characters",
  "Create and publish your own characters",
  "Access exclusive premium personas",
  "Your conversations are private and encrypted",
];

export default function SignUp() {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const nameFocus = useInputFocus();
  const emailFocus = useInputFocus();
  const passFocus = useInputFocus();
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabels = ["", "Weak", "Good", "Strong"];
  const strengthColors = ["", "bg-destructive", "bg-secondary", "bg-emerald-500"];

  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="absolute inset-0 mesh-grid opacity-25 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className="panel rounded-2xl p-10 max-w-md w-full text-center relative z-10"
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: "hsl(160 70% 40% / 0.15)", border: "1px solid hsl(160 70% 40% / 0.35)" }}>
            <Check className="w-7 h-7" style={{ color: "hsl(160 70% 55%)" }} />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Check your inbox!</h2>
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
            We've sent a confirmation link to <span className="text-foreground font-medium">{email}</span>.
            Click it to activate your account.
          </p>
          <Link to="/signin">
            <button className="btn-gradient rounded-xl py-3 px-8 font-display font-semibold text-primary-foreground text-sm">
              Back to Sign In
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex overflow-hidden">

      {/* Left — Visual panel (desktop only) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <img src={heroBg} alt="" role="presentation" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, transparent 20%, hsl(var(--background) / 0.5) 100%)" }} />
        <div className="relative z-10 flex flex-col justify-center p-16 w-full">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-sm"
          >
            <div className="w-11 h-11 rounded-xl btn-gradient flex items-center justify-center mb-6">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground mb-6 leading-snug">
              Your story starts<br />
              <span className="gradient-text">here.</span>
            </h2>
            <div className="space-y-3">
              {perks.map((perk, i) => (
                <motion.div
                  key={perk}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "hsl(var(--primary) / 0.15)", border: "1px solid hsl(var(--primary) / 0.4)" }}>
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-muted-foreground text-sm">{perk}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative">
        <div className="absolute inset-0 bg-background mesh-grid opacity-40" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-radial-crimson opacity-15 blur-3xl pointer-events-none" />

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

          <h1 className="font-display text-3xl font-bold text-foreground mb-1.5">Create your account</h1>
          <p className="text-muted-foreground text-sm mb-8">Free forever. No credit card required.</p>

          {error && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-sm"
              style={{ background: "hsl(var(--destructive) / 0.08)", border: "1px solid hsl(var(--destructive) / 0.25)", color: "hsl(var(--destructive))" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="relative glow-focus rounded-xl">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 z-10" />
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Display name" required
                className="w-full rounded-xl py-3 pl-10 pr-4 text-sm font-body surface-inset"
                onFocus={nameFocus.handleFocus}
                onBlur={nameFocus.handleBlur} />
            </div>

            <div className="relative glow-focus rounded-xl">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 z-10" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                className="w-full rounded-xl py-3 pl-10 pr-4 text-sm font-body surface-inset"
                onFocus={emailFocus.handleFocus}
                onBlur={emailFocus.handleBlur} />
            </div>

            <div className="space-y-2">
              <div className="relative glow-focus rounded-xl">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 z-10" />
                <input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Create password" required
                  className="w-full rounded-xl py-3 pl-10 pr-11 text-sm font-body surface-inset"
                  onFocus={passFocus.handleFocus}
                  onBlur={passFocus.handleBlur} />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors z-10">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i}
                        className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColors[strength] : "bg-border"}`} />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{strengthLabels[strength]}</span>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-gradient rounded-xl py-3 font-display font-semibold text-primary-foreground flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed mt-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>Create Account <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/signin" className="text-primary hover:text-primary/80 transition-colors font-medium">Sign in</Link>
          </p>
          <p className="text-center text-[10px] text-muted-foreground/40 mt-4">
            By signing up you agree to our{" "}
            <Link to="/settings/privacy" className="underline hover:text-muted-foreground transition-colors">Terms</Link>
            {" "}and{" "}
            <Link to="/settings/privacy" className="underline hover:text-muted-foreground transition-colors">Privacy Policy</Link>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
