"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLE_LANDING,
  useAuth,
  type Role,
} from "@/lib/auth";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Icons,
  Input,
  Select,
} from "@/components/ui";
import { cn } from "@/lib/cn";

const ROLES: Role[] = ["volunteer", "ngo_admin", "beneficiary", "reviewer"];

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const { signIn, signUp, session, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("volunteer");
  const [org, setOrg] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function destFor(s: { role: Role }) {
    return next && next.startsWith("/") && next !== "/login"
      ? next
      : ROLE_LANDING[s.role];
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        const s = await signIn({ email: email.trim(), password });
        router.replace(destFor(s));
      } else {
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }
        const s = await signUp({
          email: email.trim(),
          password,
          name: name.trim() || email.trim().split("@")[0],
          role,
          org: org.trim() || undefined,
        });
        router.replace(destFor(s));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center gap-2 text-sm text-muted">
        <Icons.Spinner /> Restoring session…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 py-6">
      {/* Hero */}
      <div className="space-y-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xxs uppercase tracking-tight text-muted hover:text-fg"
        >
          ← Back to home
        </Link>
        <div className="pt-2 text-xxs uppercase tracking-tight text-muted">
          {mode === "login" ? "Sign in" : "Create your account"}
        </div>
        <h1 className="text-3xl font-semibold tracking-tighter md:text-4xl">
          {mode === "login"
            ? "Welcome back to Unseen PNE"
            : "Start helping in minutes"}
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          {mode === "login"
            ? "Sign in with your email and password."
            : "Pick the role that fits how you work. Volunteers create cases, admins manage orgs, beneficiaries see only their case, reviewers audit the registry."}
          {session && " (You're already signed in.)"}
        </p>
      </div>

      {/* Tabs */}
      <div className="inline-flex items-center rounded border border-border bg-bg p-0.5 text-xs">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={cn(
              "rounded px-3 py-1.5 transition-colors",
              mode === m ? "bg-fg text-bg" : "text-muted hover:text-fg"
            )}
          >
            {m === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      {/* Form */}
      <Card>
        <CardHeader
          title={mode === "login" ? "Sign in" : "Create account"}
          description={
            mode === "login"
              ? "Use the email and password you signed up with."
              : "Your account is stored on the backend with a bcrypt-hashed password."
          }
        />
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Email">
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.org"
                  required
                />
              </Field>
              <Field
                label="Password"
                hint={mode === "signup" ? "Minimum 8 characters." : undefined}
              >
                <Input
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={mode === "signup" ? 8 : undefined}
                />
              </Field>

              {mode === "signup" && (
                <>
                  <Field label="Display name">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Asha M."
                    />
                  </Field>
                  <Field label="Organisation / ward" hint="Optional.">
                    <Input
                      value={org}
                      onChange={(e) => setOrg(e.target.value)}
                      placeholder="Hasiru Karnataka NGO"
                    />
                  </Field>
                  <Field
                    label="Role"
                    hint="Drives nav, dashboards and access."
                    className="md:col-span-2"
                  >
                    <Select
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </>
              )}
            </div>

            {mode === "signup" && (
              <div className="rounded border bg-subtle/40 px-3 py-2 text-xxs text-muted leading-relaxed">
                <span className="font-medium text-fg">
                  {ROLE_LABELS[role]}
                </span>{" "}
                — {ROLE_DESCRIPTIONS[role]} You will land on{" "}
                <span className="font-mono text-fg">{ROLE_LANDING[role]}</span>.
              </div>
            )}

            {error && (
              <div className="rounded border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <Button variant="primary" type="submit" disabled={busy}>
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Icons.Spinner size={12} />
                    {mode === "login" ? "Signing in…" : "Creating account…"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    {mode === "login" ? "Sign in" : "Create account"}
                    <Icons.ArrowRightIcon size={12} />
                  </span>
                )}
              </Button>
              {mode === "login" ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                  className="text-xxs text-muted hover:text-fg"
                >
                  No account? Create one →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  className="text-xxs text-muted hover:text-fg"
                >
                  Have an account? Sign in →
                </button>
              )}
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
