import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
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
  login: async () => {},
  register: async () => {},
  signInWithApple: async () => {},
  requestMagicLink: async () => ({ detail: "Not yet implemented" }),
  verifyMagicLink: async () => {},
  signOut: () => {},
  updateUserMeta: async () => ({ error: "Not yet implemented" }),
  updateEmail: async () => ({ error: "Not yet implemented" }),
  updatePassword: async () => ({ error: "Not yet implemented" }),
});

function setStoredToken(accessToken: string) {
  localStorage.setItem("rolevault_token", accessToken);
}

function clearStoredToken() {
  localStorage.removeItem("rolevault_token");
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
          setToken(storedToken);
        })
        .catch(() => {
          clearStoredToken();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleTokenResponse = (res: TokenResponse) => {
    setStoredToken(res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  };

  const login = async (email: string, password: string) => {
    const res = await apiFetch<TokenResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    handleTokenResponse(res);
  };

  const register = async (email: string, password: string, displayName?: string) => {
    const res = await apiFetch<TokenResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, display_name: displayName }),
    });
    handleTokenResponse(res);
  };

  const signInWithApple = async (identityToken: string) => {
    const res = await apiFetch<TokenResponse>("/api/auth/apple", {
      method: "POST",
      body: JSON.stringify({ identity_token: identityToken }),
    });
    handleTokenResponse(res);
  };

  const requestMagicLink = async (email: string) => {
    return apiFetch<{ detail: string; token?: string; expires_at?: string }>("/api/auth/magic-link/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  };

  const verifyMagicLink = async (magicToken: string) => {
    const res = await apiFetch<TokenResponse>("/api/auth/magic-link/verify", {
      method: "POST",
      body: JSON.stringify({ token: magicToken }),
    });
    handleTokenResponse(res);
  };

  const signOut = () => {
    clearStoredToken();
    setToken(null);
    setUser(null);
  };

  const updateUserMeta = async () => ({ error: "Not yet implemented" as string | null });
  const updateEmail = async () => ({ error: "Not yet implemented" as string | null });
  const updatePassword = async () => ({ error: "Not yet implemented" as string | null });

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        signInWithApple,
        requestMagicLink,
        verifyMagicLink,
        signOut,
        updateUserMeta,
        updateEmail,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
