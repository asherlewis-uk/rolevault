import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiFetch } from "@/api/client";

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
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
  signOut: () => {},
  updateUserMeta: async () => ({ error: "Not yet implemented" }),
  updateEmail: async () => ({ error: "Not yet implemented" }),
  updatePassword: async () => ({ error: "Not yet implemented" }),
});

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
          localStorage.removeItem("rolevault_token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("rolevault_token", res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: AuthUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("rolevault_token", res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const signOut = () => {
    localStorage.removeItem("rolevault_token");
    setToken(null);
    setUser(null);
  };

  const updateUserMeta = async () => ({ error: "Not yet implemented" as string | null });
  const updateEmail = async () => ({ error: "Not yet implemented" as string | null });
  const updatePassword = async () => ({ error: "Not yet implemented" as string | null });

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, signOut, updateUserMeta, updateEmail, updatePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
