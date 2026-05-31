"use client";

import * as React from "react";
import { configureApiSession } from "@/lib/api";
import { LoadingState } from "@/components/loading-state";

type User = { id: string; email: string; organizationId: string };

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  setSession: (token: string, refreshToken: string, user: User) => void;
  clearSession: () => void;
};

const AuthContext = React.createContext<AuthState | null>(null);

const STORAGE_KEY = "analytics_copilot_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(null);
  const [refreshToken, setRefreshToken] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { token: string; refreshToken?: string; user: User };
        setToken(parsed.token);
        setRefreshToken(parsed.refreshToken ?? null);
        setUser(parsed.user);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  const setSession = React.useCallback((accessToken: string, nextRefreshToken: string, nextUser: User) => {
    setToken(accessToken);
    setRefreshToken(nextRefreshToken);
    setUser(nextUser);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: accessToken, refreshToken: nextRefreshToken, user: nextUser }),
    );
  }, []);

  const clearSession = React.useCallback(() => {
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  React.useEffect(() => {
    configureApiSession({
      getRefreshToken: () => refreshToken,
      setTokens: (accessToken, nextRefreshToken) => {
        setToken(accessToken);
        setRefreshToken(nextRefreshToken);
        if (user) {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ token: accessToken, refreshToken: nextRefreshToken, user }),
          );
        }
      },
      clearSession,
    });
  }, [refreshToken, user, clearSession]);

  const value = React.useMemo(
    () => ({ token, refreshToken, user, setSession, clearSession }),
    [token, refreshToken, user, setSession, clearSession],
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <LoadingState bordered label="Loading your session…" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
