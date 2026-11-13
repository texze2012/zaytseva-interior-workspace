"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, ApiError, loginRequest } from "@/lib/api";
import { User } from "@/lib/types";

const TOKEN_KEY = "zaytseva_interior_access_token";
const PROFILE_TIMEOUT_MS = 15_000;
const PROFILE_RETRY_MS = 10_000;
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
  const [sessionError, setSessionError] = useState(false);
  const profileRequest = useRef<AbortController | null>(null);

  const clear = useCallback(() => {
    profileRequest.current?.abort();
    profileRequest.current = null;
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setSessionError(false);
    setLoading(false);
  }, []);

  const loadUser = useCallback(async (accessToken: string) => {
    profileRequest.current?.abort();
    const request = new AbortController();
    profileRequest.current = request;
    setToken(accessToken);
    setLoading(true);
    const timeout = window.setTimeout(() => request.abort(), PROFILE_TIMEOUT_MS);
    try {
      const current = await api.me(accessToken, request.signal);
      if (profileRequest.current !== request) return null;
      setUser(current);
      setSessionError(false);
      return current;
    } catch (error) {
      // A late response must not overwrite a newer session or undo logout.
      if (profileRequest.current !== request) return null;
      if (error instanceof ApiError && error.status === 401) {
        clear();
      } else {
        // Network errors, timeouts and server failures do not invalidate a token.
        setSessionError(true);
      }
      return null;
    } finally {
      window.clearTimeout(timeout);
      if (profileRequest.current === request) {
        profileRequest.current = null;
        setLoading(false);
      }
    }
  }, [clear]);

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (!saved) {
      setLoading(false);
      return;
    }
    void loadUser(saved);
    return () => {
      profileRequest.current?.abort();
      profileRequest.current = null;
    };
  }, [loadUser]);

  useEffect(() => {
    if (!loading && !token && pathname !== "/") router.replace("/");
  }, [loading, pathname, router, token]);

  useEffect(() => {
    if (!token || !sessionError || loading) return;
    const retry = () => { void loadUser(token); };
    const timer = window.setTimeout(retry, PROFILE_RETRY_MS);
    window.addEventListener("online", retry);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", retry);
    };
  }, [loadUser, loading, sessionError, token]);

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
  return <AuthContext.Provider value={value}>
    {token && !user && sessionError ? (
      <main className="fullscreen-loader">
        <div role="status" aria-live="polite">
          <strong>Не удалось проверить сессию</strong>
          <p>Вход сохранён. Попробуем подключиться снова автоматически.</p>
        </div>
        <button className="button button--primary" disabled={loading} onClick={() => { void loadUser(token); }}>
          {loading ? "Подключаемся…" : "Повторить"}
        </button>
        <button className="button" onClick={logout}>Выйти</button>
      </main>
    ) : children}
  </AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth должен использоваться внутри AuthProvider");
  return value;
}
