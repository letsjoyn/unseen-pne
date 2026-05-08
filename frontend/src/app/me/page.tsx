"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { CaseDetail, CaseSummary } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Icons,
  PageHeader,
} from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { formatINR, formatDateTime, relativeFromNow } from "@/lib/format";

export default function MePage() {
  const { session } = useAuth();
  const [list, setList] = useState<CaseSummary[] | null>(null);
  const [data, setData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cases = await api.listCases();
        if (!alive) return;
        setList(cases);

        // Pick the case for this beneficiary: explicit case_id from session,
        // or fallback to a case where the name matches, or the most recent.
        const byId = session?.case_id
          ? cases.find((c) => c.case_id === session.case_id)
          : null;
        const byName = session?.name
          ? cases.find(
              (c) =>
                (c.beneficiary_name || "").trim().toLowerCase() ===
                session.name.trim().toLowerCase()
            )
          : null;
        const target = byId || byName || cases[0];

        if (target) {
          const d = await api.getCase(target.case_id);
          if (alive) setData(d);
        }
      } catch (e) {
        if (alive) setError(String((e as Error)?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [session]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center gap-2 text-sm text-muted">
        <Icons.Spinner /> Loading your case…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded border bg-subtle px-6 py-10 text-center">
        <div className="text-sm font-medium">No case linked to you yet.</div>
        <p className="mt-1 text-xs text-muted">
          Ask your community volunteer to create one — they will share an SMS
          link to track your application.
        </p>
        {list && list.length > 0 && (
          <p className="mt-3 text-xxs text-muted">
            ({list.length} cases exist in the system but none are linked to{" "}
            <span className="font-mono">{session?.user_id}</span>.)
          </p>
        )}
      </div>
    );
  }

  const eligible = data.matches.filter((m) => m.eligibility !== "not_eligible");
  const top = eligible[0];
  const blockerForTop = top
    ? data.blockers.find((b) => b.scheme_id === top.scheme_id) || null
    : null;
  const nextFollowup = data.followups.find((f) => f.status === "pending");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Hello, ${data.case.beneficiary_name || session?.name || "friend"}`}
        title="Your support application"
        description="A simple view of where your case is. Your volunteer is handling the paperwork — we'll text you when there's an update."
        right={<StatusBadge status={data.case.status} />}
      />

      {/* Hero — what you stand to gain */}
      <section className="rounded border bg-bg px-6 py-6">
        <div className="text-xxs uppercase tracking-tight text-muted">
          Estimated benefits being pursued for you
        </div>
        <div className="mt-2 text-4xl font-semibold tracking-tighter tabular md:text-5xl">
          {formatINR(data.missed_value_inr || 0)}
        </div>
        <p className="mt-2 max-w-xl text-xs text-muted">
          Across {eligible.length} government scheme
          {eligible.length === 1 ? "" : "s"} you appear to qualify for. This is
          an estimate — actual amounts depend on official approval.
        </p>
      </section>

      {/* Schemes */}
      <Card>
        <CardHeader
          title="Schemes you qualify for"
          description="Reviewed by your volunteer. Your information was matched against eligibility rules from each scheme."
        />
        <CardBody className="px-0 py-0">
          {eligible.length === 0 ? (
            <div className="px-5 py-6 text-sm text-muted">
              No matches yet. Your volunteer is still working on this.
            </div>
          ) : (
            <ul className="dotline-y">
              {eligible.slice(0, 5).map((m) => (
                <li key={m.scheme_id} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-fg bg-fg text-bg">
                    <Icons.CheckIcon size={12} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold tracking-tight">
                        {m.scheme_name || m.scheme_id}
                      </div>
                      {m.estimated_annual_value_inr ? (
                        <Badge tone="fg" className="tabular">
                          {formatINR(m.estimated_annual_value_inr)}/yr
                        </Badge>
                      ) : null}
                    </div>
                    {m.scheme_summary && (
                      <div className="mt-0.5 text-xs text-muted leading-relaxed">
                        {m.scheme_summary}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* What's needed from you */}
      {blockerForTop && blockerForTop.minimum_path?.length > 0 && (
        <Card>
          <CardHeader
            title="What we still need from you"
            description={
              <>
                For{" "}
                <span className="font-medium text-fg">
                  {blockerForTop.scheme_name || blockerForTop.scheme_id}
                </span>{" "}
                — your volunteer is helping with these.
              </>
            }
          />
          <CardBody>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
              {blockerForTop.minimum_path.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </CardBody>
        </Card>
      )}

      {/* Next contact */}
      {nextFollowup && (
        <Card>
          <CardHeader title="Next contact" />
          <CardBody>
            <div className="flex flex-wrap items-center gap-3">
              <Icons.ClockIcon size={16} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">
                  {nextFollowup.type.replaceAll("_", " ")}
                </div>
                <div className="text-xxs text-muted tabular">
                  {formatDateTime(nextFollowup.due_at)} ·{" "}
                  {relativeFromNow(nextFollowup.due_at)}
                </div>
              </div>
              <Badge tone="warn">{nextFollowup.status}</Badge>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Help line */}
      <div className="rounded border bg-subtle/40 px-5 py-4 text-xs text-muted">
        <div className="font-medium text-fg">Questions?</div>
        <p className="mt-1">
          Your volunteer is the best person to call. Their direct number is on
          the printed letter we shared with you. You can also reply to the
          email we sent.
        </p>
        {data && (
          <div className="mt-2 font-mono text-xxs">
            Reference: {data.case.id}
          </div>
        )}
      </div>

      {/* Subtle "secret" link to operator view, only visible if user types in URL */}
      <div className="text-center text-xxs text-muted">
        <Link href={`/cases/${data.case.id}`} className="hover:text-fg">
          Volunteer view →
        </Link>
      </div>
    </div>
  );
}
