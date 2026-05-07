import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api, tokenStore } from "./api";

interface AuthState {
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setAuthed] = useState<boolean>(!!tokenStore.get());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAuthed(!!tokenStore.get());
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api<{ access_token: string }>("/auth/login", {
        method: "POST",
        form: { username: email, password },
      });
      tokenStore.set(res.access_token);
      setAuthed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(
    async (email: string, password: string, fullName?: string) => {
      setLoading(true);
      try {
        await api("/auth/signup", {
          method: "POST",
          body: { email, password, full_name: fullName },
        });
        await login(email, password);
      } finally {
        setLoading(false);
      }
    },
    [login],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setAuthed(false);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
