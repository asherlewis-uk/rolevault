import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function MagicLinkVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyMagicLink } = useAuth();

  const token = searchParams.get("token");
  const nonce = searchParams.get("nonce");
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [error, setError] = useState<string | null>(null);
  const verifyMagicLinkRef = useRef(verifyMagicLink);
  const navigateRef = useRef(navigate);

  useEffect(() => {
    verifyMagicLinkRef.current = verifyMagicLink;
  }, [verifyMagicLink]);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    if (!token || !nonce) {
      setStatus("error");
      setError("No magic link token or nonce found in the URL.");
      return;
    }

    let cancelled = false;
    let redirectTimeout: ReturnType<typeof setTimeout> | undefined;
    setStatus("verifying");
    setError(null);

    verifyMagicLinkRef.current(token, nonce)
      .then(() => {
        if (!cancelled) {
          setStatus("success");
          redirectTimeout = setTimeout(() => navigateRef.current("/", { replace: true }), 1500);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "Invalid or expired magic link.");
        }
      });

    return () => {
      cancelled = true;
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }
    };
  }, [token, nonce]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="absolute inset-0 mesh-grid opacity-25 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md relative z-10 text-center"
      >
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-xl btn-gradient flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl gradient-text">RoleVault</span>
        </Link>

        {status === "verifying" && (
          <div className="panel rounded-2xl p-10">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Signing you in...</h2>
            <p className="text-muted-foreground text-sm">Verifying your magic link.</p>
          </div>
        )}

        {status === "success" && (
          <div className="panel rounded-2xl p-10">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">You're signed in!</h2>
            <p className="text-muted-foreground text-sm">Redirecting you now...</p>
          </div>
        )}

        {status === "error" && (
          <div className="panel rounded-2xl p-10">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Link expired or invalid</h2>
            <p className="text-muted-foreground text-sm mb-6">{error}</p>
            <Link
              to="/signin"
              className="inline-block btn-gradient rounded-xl py-3 px-8 font-display font-semibold text-primary-foreground text-sm"
            >
              Back to Sign In
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
