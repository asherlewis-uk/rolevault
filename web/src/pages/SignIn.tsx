import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mail,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Loader2,
  Zap,
} from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { useAuth } from "@/context/AuthContext";
import { useInputFocus } from "@/hooks/useInputFocus";

type AppleAuthConfig = {
  clientId: string;
  scope: string;
  redirectURI: string;
  usePopup: boolean;
};

type AppleAuth = {
  init: (config: AppleAuthConfig) => void;
  signIn: () => Promise<{ authorization?: { code?: string; id_token?: string } }>;
};

const appleAuthScriptUrl =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

function canShowMagicLinkDevToken() {
  return import.meta.env.DEV || ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function getAppleAuth(): AppleAuth | null {
  const apple = (window as Window & { AppleID?: { auth?: Partial<AppleAuth> } }).AppleID;
  if (
    !apple?.auth ||
    typeof apple.auth.init !== "function" ||
    typeof apple.auth.signIn !== "function"
  ) {
    return null;
  }

  return apple.auth as AppleAuth;
}

function loadAppleAuth(): Promise<AppleAuth> {
  const existingAuth = getAppleAuth();
  if (existingAuth) return Promise.resolve(existingAuth);

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${appleAuthScriptUrl}"]`);
    const script = existingScript ?? document.createElement("script");

    const timeout = window.setTimeout(() => {
      reject(new Error("Apple Sign In is still loading. Please try again."));
    }, 8000);

    const finish = () => {
      window.clearTimeout(timeout);
      const auth = getAppleAuth();
      if (auth) {
        resolve(auth);
      } else {
        reject(new Error("Apple Sign In is not available. Please use magic link instead."));
      }
    };

    script.addEventListener("load", finish, { once: true });
    script.addEventListener(
      "error",
      () => {
        window.clearTimeout(timeout);
        reject(new Error("Apple Sign In failed to load. Please use magic link instead."));
      },
      { once: true }
    );

    if (!existingScript) {
      script.src = appleAuthScriptUrl;
      script.async = true;
      document.body.appendChild(script);
    }
  });
}

export default function SignIn() {
  const navigate = useNavigate();
  const { requestMagicLink, signInWithApple } = useAuth();
  const appleClientId = import.meta.env.VITE_APPLE_CLIENT_ID?.trim();
  const appleRedirectURI =
    import.meta.env.VITE_APPLE_REDIRECT_URI || `${window.location.origin}/signin`;
  const showMagicLinkDevToken = canShowMagicLinkDevToken();
  const appleAuthRef = useRef<AppleAuth | null>(null);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkDevToken, setMagicLinkDevToken] = useState<string | null>(null);

  const emailFocus = useInputFocus();

  const initializeAppleAuth = useCallback(async () => {
    if (!appleClientId) {
      throw new Error("Apple Sign In is not configured for this site. Please use magic link instead.");
    }

    const appleAuth = await loadAppleAuth();
    appleAuth.init({
      clientId: appleClientId,
      scope: "name email",
      redirectURI: appleRedirectURI,
      usePopup: true,
    });
    appleAuthRef.current = appleAuth;
    return appleAuth;
  }, [appleClientId, appleRedirectURI]);

  useEffect(() => {
    initializeAppleAuth().catch(() => {
      appleAuthRef.current = null;
    });
  }, [initializeAppleAuth]);

  const handleMagicLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await requestMagicLink(email);
      if (res.token && !showMagicLinkDevToken) {
        throw new Error(
          "Magic link email is misconfigured for this deployment. Disable backend debug tokens or configure email delivery."
        );
      }
      setMagicLinkSent(true);
      setMagicLinkDevToken(res.token ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError(null);

    try {
      const appleAuth = appleAuthRef.current ?? await initializeAppleAuth();
      const response = await appleAuth.signIn();

      const idToken = response.authorization?.id_token;
      if (!idToken) {
        setError("Apple Sign In did not return an identity token.");
        return;
      }

      setLoading(true);
      await signInWithApple(idToken);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apple Sign In failed");
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

          <h1 className="font-display text-3xl font-bold text-foreground mb-1.5">
            {magicLinkSent ? "Check your inbox" : "Welcome back"}
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            {magicLinkSent
              ? "We sent a one-time sign-in link to your email."
              : "Sign in with Apple or use a magic link — no password needed."}
          </p>

          {error && (
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-sm"
              style={{
                background: "hsl(var(--destructive) / 0.08)",
                border: "1px solid hsl(var(--destructive) / 0.25)",
                color: "hsl(var(--destructive))",
              }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {magicLinkSent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="panel rounded-2xl p-8 text-center"
            >
              <Zap className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                Magic link sent
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                We sent a magic link to{" "}
                <span className="text-foreground font-medium">{email}</span>. Click it to sign
                in instantly — no password needed.
              </p>
              {magicLinkDevToken && (
                <div className="text-left">
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">
                    Dev token
                  </p>
                  <code className="block bg-muted rounded-lg px-3 py-2 text-xs break-all text-muted-foreground">
                    {magicLinkDevToken}
                  </code>
                  <Link
                    to={`/magic-link?token=${encodeURIComponent(magicLinkDevToken)}`}
                    className="text-xs text-primary hover:text-primary/80 transition-colors mt-2 inline-block"
                  >
                    Click here to verify →
                  </Link>
                </div>
              )}
              <button
                onClick={() => {
                  setMagicLinkSent(false);
                  setMagicLinkDevToken(null);
                  setError(null);
                }}
                className="mt-5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to sign in
              </button>
            </motion.div>
          ) : (
            <>
              {/* Apple Sign In */}
              <button
                type="button"
                onClick={handleAppleSignIn}
                disabled={loading}
                className="w-full rounded-xl py-3 font-display font-semibold text-sm flex items-center justify-center gap-2
                  bg-foreground text-background hover:bg-foreground/90 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Sign in with Apple
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground">or</span>
                </div>
              </div>

              <form
                onSubmit={handleMagicLinkRequest}
                className="space-y-3.5"
              >
                {/* Email */}
                <div className="relative glow-focus rounded-xl">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 z-10" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-xl py-3 pl-10 pr-4 text-sm font-body surface-inset"
                    onFocus={emailFocus.handleFocus}
                    onBlur={emailFocus.handleBlur}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-gradient rounded-xl py-3 font-display font-semibold text-primary-foreground flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Send Magic Link{" "}
                      <Zap className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-[10px] text-muted-foreground/40 mt-4">
            By signing in you agree to our{" "}
            <Link
              to="/settings/privacy"
              className="underline hover:text-muted-foreground transition-colors"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              to="/settings/privacy"
              className="underline hover:text-muted-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </motion.div>
      </div>

      {/* Right — Visual panel (desktop only) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <img src={heroBg} alt="RoleVault" className="absolute inset-0 w-full h-full object-cover" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to left, transparent 20%, hsl(var(--background) / 0.5) 100%)",
          }}
        />
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
              Infinite minds,
              <br />
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
