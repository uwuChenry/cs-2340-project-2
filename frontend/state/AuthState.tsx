"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, http, messageOf } from "@/lib/api";
import type { ApiRegisterBody, ApiSessionUser } from "@/lib/apiTypes";

type AuthValue = {
  user: ApiSessionUser | null;
  // False until the first /api/auth/session/ call settles, so pages do not
  // bounce a signed-in user to /login while the cookie is still being checked.
  ready: boolean;
  // Set when the session check itself failed (backend down), not when signed out.
  error: string | null;
  login: (username: string, password: string) => Promise<ApiSessionUser>;
  // Creates the account and signs it in, so the caller can go straight to onboarding.
  register: (body: ApiRegisterBody) => Promise<ApiSessionUser>;
  logout: () => Promise<void>;
  // Re-reads the session, e.g. after the user changes their name on a profile page.
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiSessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    // A timeout, so a hung backend can't leave the navbar waiting forever.
    api<{ user: ApiSessionUser | null }>("/api/auth/session/", { timeoutMs: 6000 })
      .then((data) => alive && setUser(data.user))
      .catch((e) => alive && setError(messageOf(e)))
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  async function login(username: string, password: string) {
    const signedIn = await http.post<ApiSessionUser>("/api/auth/login/", { username, password });
    setUser(signedIn);
    setError(null);
    return signedIn;
  }

  async function register(body: ApiRegisterBody) {
    const created = await http.post<ApiSessionUser>("/api/auth/register/", body);
    setUser(created);
    setError(null);
    return created;
  }

  async function logout() {
    await http.post("/api/auth/logout/");
    setUser(null);
  }

  async function refresh() {
    const data = await http.get<{ user: ApiSessionUser | null }>("/api/auth/session/");
    setUser(data.user);
  }

  return (
    <AuthContext.Provider value={{ user, ready, error, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0].toUpperCase())
      .join("")
      .slice(0, 2) || "?"
  );
}
