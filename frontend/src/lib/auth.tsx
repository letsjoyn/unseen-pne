"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Role = "volunteer" | "ngo_admin" | "beneficiary" | "reviewer";

/** What the backend returns for an authenticated user. */
export type Session = {
  id: number;
  email: string;
  name: string;
  role: Role;
  org: string | null;
  case_id: string | null;
  active: boolean;
  created_at: string;
  last_login_at: string | null;
};

export const ROLE_LABELS: Record<Role, string> = {
  volunteer: "Volunteer / NGO worker",
  ngo_admin: "NGO admin",
  beneficiary: "Beneficiary",
  reviewer: "Scheme reviewer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  volunteer:
    "Frontline operator. Creates intakes, reviews matches, approves packets.",
  ngo_admin:
    "NGO lead. Sees all org cases, insights, and configures schemes/prompts.",
  beneficiary:
    "Resident. Sees only their own case status and what's next.",
  reviewer:
    "Scheme steward. Audits the scheme registry, eligibility rules and citations.",
};

export const ROLE_LANDING: Record<Role, string> = {
  volunteer: "/cases",
  ngo_admin: "/admin/cases",
  beneficiary: "/me",
  reviewer: "/admin/schemes",
};

const PUBLIC_ROUTES = ["/", "/login"];

export function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_ROUTES.some(
    (p) => p !== "/" && (pathname === p || pathname.startsWith(p + "/"))
  );
}

const ROLE_ROUTES: Record<Role, string[]> = {
  volunteer: ["/", "/cases", "/intake", "/insights"],
  ngo_admin: [
    "/",
    "/cases",
    "/intake",
    "/insights",
    "/admin",
    "/admin/cases",
    "/admin/insights",
    "/admin/schemes",
  ],
  beneficiary: ["/", "/me"],
  reviewer: ["/", "/admin", "/admin/schemes", "/insights"],
};

export function isAllowed(role: Role, pathname: string): boolean {
  if (isPublic(pathname)) return true;
  return ROLE_ROUTES[role].some(
    (allowed) => pathname === allowed || pathname.startsWith(allowed + "/")
  );
}

const TOKEN_KEY = "unseen-pne:jwt:v1";

const API_BASE =
  (typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")
    : null) || "http://localhost:8080";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** Synchronous read for non-React callers (e.g. api.ts). */
export function authToken(): string | null {
  return getStoredToken();
}

export type SignupArgs = {
  email: string;
  password: string;
  name: string;
  role: Role;
  org?: string;
  case_id?: string;
};

export type LoginArgs = {
  email: string;
  password: string;
};

type AuthCtx = {
  session: Session | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  signUp: (args: SignupArgs) => Promise<Session>;
  signIn: (args: LoginArgs) => Promise<Session>;
  signOut: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

async function postAuth(
  path: "/api/auth/signup" | "/api/auth/login",
  body: SignupArgs | LoginArgs
): Promise<{ token: string; user: Session }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      detail = j.detail || j.message || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json();
}

async function fetchMe(token: string): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`me failed: ${res.status}`);
  return res.json();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // On mount: try to rehydrate from stored token.
  useEffect(() => {
    let alive = true;
    (async () => {
      const stored = getStoredToken();
      if (!stored) {
        if (alive) setLoading(false);
        return;
      }
      try {
        const me = await fetchMe(stored);
        if (!alive) return;
        setToken(stored);
        setSession(me);
      } catch {
        // Token invalid/expired → drop it
        setStoredToken(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const signUp = useCallback(async (args: SignupArgs) => {
    setError(null);
    try {
      const { token: t, user } = await postAuth("/api/auth/signup", args);
      setStoredToken(t);
      setToken(t);
      setSession(user);
      return user;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sign up failed";
      setError(msg);
      throw e;
    }
  }, []);

  const signIn = useCallback(async (args: LoginArgs) => {
    setError(null);
    try {
      const { token: t, user } = await postAuth("/api/auth/login", args);
      setStoredToken(t);
      setToken(t);
      setSession(user);
      return user;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sign in failed";
      setError(msg);
      throw e;
    }
  }, []);

  const signOut = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setSession(null);
    setError(null);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({ session, token, loading, error, signUp, signIn, signOut }),
    [session, token, loading, error, signUp, signIn, signOut]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>");
  return c;
}
