"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ROLE_LANDING, useAuth } from "@/lib/auth";
import { Icons } from "@/components/ui";

export default function HomePage() {
  const { session, loading } = useAuth();
  const router = useRouter();

  // Auto-redirect signed-in users to their role landing
  useEffect(() => {
    if (loading) return;
    if (session) router.replace(ROLE_LANDING[session.role]);
  }, [loading, session, router]);

  if (loading || session) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-muted">
        <div className="flex items-center gap-2">
          <Icons.Spinner /> Taking you to your dashboard…
        </div>
        {session && (
          <Link
            href={ROLE_LANDING[session.role]}
            className="text-xxs text-fg underline-offset-2 hover:underline"
          >
            Or click here →
          </Link>
        )}
      </div>
    );
  }

  // Marketing splash for unauthenticated users
  return (
    <div className="space-y-20">
      <section className="pt-6">
        <div className="text-xxs uppercase tracking-tight text-muted">
          Community operations · India
        </div>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tighter md:text-5xl">
          Find the forgotten. Prove the need.
          <span className="block text-muted">Route the help. Close the loop.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted">
          A multi-agent system that turns one volunteer intake into a verified
          benefits case — eligibility decided by rules, blockers identified,
          packets drafted, routing chosen, follow-ups scheduled.
        </p>
        <div className="mt-7 flex flex-wrap gap-2">
          <Link href="/login">
            <Button variant="primary">
              <span className="inline-flex items-center gap-1.5">
                Sign in <Icons.ArrowRightIcon size={12} />
              </span>
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-px overflow-hidden rounded border bg-border md:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="bg-bg p-6">
            <div className="text-xxs uppercase tracking-tight text-muted">
              {f.tag}
            </div>
            <div className="mt-2 text-base font-semibold tracking-tight">
              {f.title}
            </div>
            <p className="mt-2 text-sm text-muted">{f.desc}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="text-xxs uppercase tracking-tight text-muted">
          The pipeline
        </div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">
          Eight agents, one case lifecycle
        </h2>
        <ol className="mt-6 grid gap-px overflow-hidden rounded border bg-border md:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="bg-bg p-5">
              <div className="font-mono text-xxs text-muted">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="mt-2 text-sm font-semibold tracking-tight">
                {s.title}
              </div>
              <p className="mt-1 text-xs text-muted">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

const features = [
  {
    tag: "Action",
    title: "AI that ships work, not chat",
    desc: "Generates application packets, picks the best channel and books follow-ups.",
  },
  {
    tag: "Multi-agent",
    title: "Eight cooperating agents",
    desc: "Profiler · Hunter · Matcher · Validator · Closer · Router · Watchdog · Insights.",
  },
  {
    tag: "Config-driven",
    title: "Zero hardcoded rules",
    desc: "Schemes, prompts, weights and cadences are registry rows you can edit live.",
  },
];

const steps = [
  { title: "Intake", desc: "One form. Consent and basic facts." },
  { title: "Profile", desc: "Structured profile + DER score." },
  { title: "Discover", desc: "Candidate schemes from registry + RAG." },
  { title: "Decide", desc: "JSONLogic rules → eligible / probable." },
  { title: "Resolve", desc: "Blockers + minimum path to submission." },
  { title: "Draft", desc: "Cover letter, email, checklist." },
  { title: "Route", desc: "Best channel via policy weights." },
  { title: "Follow up", desc: "Scheduled tasks + SLA escalation." },
];
