import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { apiFetch } from "@/api/client";

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signInWithApple: (identityToken: string) => Promise<void>;
  requestMagicLink: (email: string) => Promise<{ detail: string; token?: string; expires_at?: string }>;
  verifyMagicLink: (token: string) => Promise<void>;
  signOut: () => void;
  updateUserMeta: (meta: Record<string, string>) => Promise<{ error: string | null }>;
  updateEmail: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loading: true,
  signInWithApple: async () => {},
  requestMagicLink: async () => ({ detail: "Not yet implemented" }),
  verifyMagicLink: async () => {},
  signOut: () => {},
  updateUserMeta: async () => ({ error: "Not yet implemented" as string | null }),
  updateEmail: async () => ({ error: "Not yet implemented" as string | null }),
  updatePassword: async () => ({ error: "Not yet implemented" as string | null }),
});

function setStoredTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem("rolevault_token", accessToken);
  if (refreshToken) {
    localStorage.setItem("rolevault_refresh_token", refreshToken);
  }
}

function clearStoredTokens() {
  localStorage.removeItem("rolevault_token");
  localStorage.removeItem("rolevault_refresh_token");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("rolevault_token");
    if (storedToken) {
      apiFetch<{ id: string; email: string; displayName?: string }>("/api/auth/me")
        .then((me) => {
          setUser(me);
          setToken(localStorage.getItem("rolevault_token") ?? storedToken);
        })
        .catch(() => {
          clearStoredTokens();
          setUser(null);
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleTokenResponse = useCallback((res: TokenResponse) => {
    setStoredTokens(res.access_token, res.refresh_token);
    setToken(res.access_token);
    setUser(res.user);
  }, []);

  const signInWithApple = useCallback(async (identityToken: string) => {
    const res = await apiFetch<TokenResponse>("/api/auth/apple", {
      method: "POST",
      body: JSON.stringify({ identity_token: identityToken }),
    });
    handleTokenResponse(res);
  }, [handleTokenResponse]);

  const requestMagicLink = useCallback(async (email: string) => {
    return apiFetch<{ detail: string; token?: string; expires_at?: string }>("/api/auth/magic-link/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }, []);

  const verifyMagicLink = useCallback(async (magicToken: string) => {
    const res = await apiFetch<TokenResponse>("/api/auth/magic-link/verify", {
      method: "POST",
      body: JSON.stringify({ token: magicToken }),
    });
    handleTokenResponse(res);
  }, [handleTokenResponse]);

  const signOut = useCallback(() => {
    clearStoredTokens();
    setToken(null);
    setUser(null);
  }, []);

  const updateUserMeta = useCallback(async () => ({ error: "Not yet implemented" as string | null }), []);
  const updateEmail = useCallback(async () => ({ error: "Not yet implemented" as string | null }), []);
  const updatePassword = useCallback(async () => ({ error: "Not yet implemented" as string | null }), []);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    signInWithApple,
    requestMagicLink,
    verifyMagicLink,
    signOut,
    updateUserMeta,
    updateEmail,
    updatePassword,
  }), [
    user,
    token,
    loading,
    signInWithApple,
    requestMagicLink,
    verifyMagicLink,
    signOut,
    updateUserMeta,
    updateEmail,
    updatePassword,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
