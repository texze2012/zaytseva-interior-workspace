"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const loadUser = useCallback(
    async (accessToken: string) => {
      try {
        const currentUser = await api.me(accessToken);
        setToken(accessToken);
        setUser(currentUser);
        return currentUser;
      } catch {
        clearSession();
        return null;
      }
    },
    [clearSession]
  );

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);

    if (!storedToken) {
      setLoading(false);
      return;
    }

    loadUser(storedToken).finally(() => setLoading(false));
  }, [loadUser]);

  useEffect(() => {
    if (!loading && !user && pathname !== "/") {
      router.replace("/");
    }
  }, [loading, pathname, router, user]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginRequest(email, password);
      localStorage.setItem(TOKEN_KEY, result.access_token);

      const currentUser = await loadUser(result.access_token);

      if (!currentUser) {
        throw new Error("Не удалось загрузить профиль пользователя");
      }

      return currentUser;
    },
    [loadUser]
  );

  const logout = useCallback(() => {
    clearSession();
    router.replace("/");
  }, [clearSession, router]);

  const refreshUser = useCallback(async () => {
    if (!token) return null;
    return loadUser(token);
  }, [loadUser, token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      loading,
      login,
      logout,
      refreshUser,
    }),
    [loading, login, logout, refreshUser, token, user]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth должен использоваться внутри AuthProvider");
  }

  return context;
}
