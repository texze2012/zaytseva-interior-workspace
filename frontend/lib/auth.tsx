"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, loginRequest } from "@/lib/api";
import { User } from "@/lib/types";

const TOKEN_KEY = "zaytseva_interior_access_token";
interface AuthContextValue {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clear = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const loadUser = useCallback(async (accessToken: string) => {
    try {
      const current = await api.me(accessToken);
      setToken(accessToken);
      setUser(current);
      return current;
    } catch {
      clear();
      return null;
    }
  }, [clear]);

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (!saved) {
      setLoading(false);
      return;
    }
    loadUser(saved).finally(() => setLoading(false));
  }, [loadUser]);

  useEffect(() => {
    if (!loading && !user && pathname !== "/") router.replace("/");
  }, [loading, pathname, router, user]);

  const login = useCallback(async (email: string, password: string) => {
    const auth = await loginRequest(email, password);
    localStorage.setItem(TOKEN_KEY, auth.access_token);
    const current = await loadUser(auth.access_token);
    if (!current) throw new Error("Не удалось загрузить профиль пользователя");
    return current;
  }, [loadUser]);

  const logout = useCallback(() => {
    clear();
    router.replace("/");
  }, [clear, router]);

  const value = useMemo(() => ({ token, user, loading, login, logout }), [token, user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth должен использоваться внутри AuthProvider");
  return value;
}
