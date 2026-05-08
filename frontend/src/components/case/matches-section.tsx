"use client";

import { useState } from "react";
import type { Match } from "@/lib/types";
import {
  Card,
  CardBody,
  CardHeader,
  Progress,
  Icons,
} from "@/components/ui";
import { EligibilityBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/cn";

export function MatchesSection({ matches }: { matches: Match[] }) {
  const eligible = matches.filter((m) => m.eligibility !== "not_eligible");
  return (
    <Card>
      <CardHeader
        title="Top matches"
        description="Eligibility decided by the JSONLogic rules engine over the scheme registry."
        right={<Badge>{eligible.length} eligible</Badge>}
      />
      <CardBody className="px-0 py-0">
        {eligible.length === 0 ? (
          <div className="px-5 py-6 text-sm text-muted">
            No eligible or probable matches.
          </div>
        ) : (
          <ul className="dotline-y">
            {eligible.slice(0, 6).map((m) => (
              <MatchRow key={m.scheme_id} match={m} />
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function MatchRow({ match: m }: { match: Match }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold tracking-tight">
              {m.scheme_name || m.scheme_id}
            </div>
            <span className="font-mono text-xxs text-muted">{m.scheme_id}</span>
            {m.scheme_category && (
              <Badge>{m.scheme_category.replaceAll("_", " ")}</Badge>
            )}
          </div>
          {m.scheme_summary && (
            <div className="mt-1 line-clamp-2 text-xs text-muted">
              {m.scheme_summary}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <EligibilityBadge value={m.eligibility} />
          {m.estimated_annual_value_inr ? (
            <Badge tone="fg" className="tabular">
              {formatINR(m.estimated_annual_value_inr)}/yr
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <ConfidenceMetric label="Match score" value={m.score} />
        <ConfidenceMetric label="Confidence" value={m.confidence} />
      </div>

      {m.reason_codes?.length ? (
        <ul className="mt-3 space-y-1">
          {m.reason_codes.slice(0, 3).map((r, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-xs text-muted"
            >
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-fg" />
              <span className="leading-relaxed">{r}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xxs">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-muted hover:text-fg"
        >
          <Icons.ChevronDownIcon
            size={12}
            className={cn("transition-transform", open && "rotate-180")}
          />
          {open ? "Hide details" : "View details"}
        </button>
        {m.citations?.slice(0, 1).map((c, i) => (
          <a
            key={i}
            href={c.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-fg underline-offset-2 hover:underline"
          >
            <Icons.FileTextIcon size={11} />
            source · verified {c.last_verified_at?.slice(0, 10)}
          </a>
        ))}
      </div>

      {open && (
        <div className="mt-3 rounded border bg-subtle/40 px-3 py-3 text-xs">
          <div className="text-xxs uppercase tracking-tight text-muted">
            Required documents
          </div>
          {m.required_documents && m.required_documents.length > 0 ? (
            <ul className="mt-1 flex flex-wrap gap-1">
              {m.required_documents.map((d) => (
                <li
                  key={d}
                  className="rounded border border-border bg-bg px-1.5 py-0.5 text-xxs uppercase tracking-tight text-muted"
                >
                  {d.replaceAll("_", " ")}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-1 text-xxs text-muted">Not specified.</div>
          )}

          {m.reason_codes?.length > 3 && (
            <>
              <div className="mt-3 text-xxs uppercase tracking-tight text-muted">
                Additional reason codes
              </div>
              <ul className="mt-1 space-y-1">
                {m.reason_codes.slice(3).map((r, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-muted"
                  >
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted" />
                    <span className="leading-relaxed">{r}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {m.citations && m.citations.length > 0 && (
            <>
              <div className="mt-3 text-xxs uppercase tracking-tight text-muted">
                Citations
              </div>
              <ul className="mt-1 space-y-0.5">
                {m.citations.map((c, i) => (
                  <li key={i}>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xxs text-fg underline-offset-2 hover:underline"
                    >
                      {c.url}
                    </a>
                    {c.last_verified_at && (
                      <span className="ml-2 text-xxs text-muted">
                        verified {c.last_verified_at.slice(0, 10)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </li>
  );
}

function ConfidenceMetric({ label, value }: { label: string; value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xxs uppercase tracking-tight text-muted">
        <span>{label}</span>
        <span className="font-mono tabular text-fg">{pct}%</span>
      </div>
      <Progress value={value} className="mt-1" />
    </div>
  );
}
