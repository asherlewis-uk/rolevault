import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  AUTH_SESSION_REJECTED_EVENT,
  apiFetch,
  clearStoredAuthTokens,
  getAuthDeviceId,
} from "@/api/client";

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
  signInWithApple: (identityToken: string, nonce: string) => Promise<void>;
  requestMagicLink: (email: string) => Promise<{ detail: string; token?: string; nonce?: string; expires_at?: string }>;
  verifyMagicLink: (token: string, nonce: string) => Promise<void>;
  signOut: () => void;
  updateUserMeta: (meta: Record<string, string>) => Promise<{ error: string | null }>;
  updateEmail: (email: string) => Promise<{ error: string | null }>;
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
});

function setStoredTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem("rolevault_token", accessToken);
  if (refreshToken) {
    localStorage.setItem("rolevault_refresh_token", refreshToken);
  }
}

function clearStoredTokens() {
  clearStoredAuthTokens();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSessionState = useCallback(() => {
    clearStoredTokens();
    setUser(null);
    setToken(null);
  }, []);

  useEffect(() => {
    window.addEventListener(AUTH_SESSION_REJECTED_EVENT, clearSessionState);
    return () => window.removeEventListener(AUTH_SESSION_REJECTED_EVENT, clearSessionState);
  }, [clearSessionState]);

  useEffect(() => {
    const storedToken = localStorage.getItem("rolevault_token");
    if (storedToken) {
      apiFetch<{ id: string; email: string; displayName?: string }>("/api/auth/me")
        .then((me) => {
          setUser(me);
          setToken(localStorage.getItem("rolevault_token") ?? storedToken);
        })
        .catch(() => {
          clearSessionState();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [clearSessionState]);

  const handleTokenResponse = useCallback((res: TokenResponse) => {
    setStoredTokens(res.access_token, res.refresh_token);
    setToken(res.access_token);
    setUser(res.user);
  }, []);

  const signInWithApple = useCallback(async (identityToken: string, nonce: string) => {
    const res = await apiFetch<TokenResponse>("/api/auth/apple", {
      method: "POST",
      body: JSON.stringify({
        identity_token: identityToken,
        device_id: getAuthDeviceId(),
        nonce,
        platform: "web",
      }),
    });
    handleTokenResponse(res);
  }, [handleTokenResponse]);

  const requestMagicLink = useCallback(async (email: string) => {
    return apiFetch<{ detail: string; token?: string; nonce?: string; expires_at?: string }>("/api/auth/magic-link/request", {
      method: "POST",
      body: JSON.stringify({ email, device_id: getAuthDeviceId() }),
    });
  }, []);

  const verifyMagicLink = useCallback(async (magicToken: string, nonce: string) => {
    const res = await apiFetch<TokenResponse>("/api/auth/magic-link/verify", {
      method: "POST",
      body: JSON.stringify({ token: magicToken, nonce, device_id: getAuthDeviceId() }),
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
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
