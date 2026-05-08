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

export type Session = {
  user_id: string;
  name: string;
  role: Role;
  org: string;
  /** beneficiary-only: case_id they are tied to */
  case_id?: string;
  signed_in_at: string;
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

/** Routes that don't require auth */
const PUBLIC_ROUTES = ["/login"];

/** Per-role access control. Volunteer is the most restrictive baseline. */
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
  if (PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/")))
    return true;
  return ROLE_ROUTES[role].some(
    (allowed) => pathname === allowed || pathname.startsWith(allowed + "/")
  );
}

const STORAGE_KEY = "unseen-pne:session:v1";

type AuthCtx = {
  session: Session | null;
  loading: boolean;
  signIn: (s: Omit<Session, "signed_in_at">) => Session;
  signOut: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setSession(JSON.parse(raw) as Session);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback((s: Omit<Session, "signed_in_at">) => {
    const next: Session = { ...s, signed_in_at: new Date().toISOString() };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setSession(next);
    return next;
  }, []);

  const signOut = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setSession(null);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({ session, loading, signIn, signOut }),
    [session, loading, signIn, signOut]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>");
  return c;
}
