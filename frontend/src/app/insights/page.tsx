"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { InsightsSummary } from "@/lib/types";
import {
  Card,
  CardBody,
  CardHeader,
  Icons,
  PageHeader,
  Stat,
} from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatDateTime,
  formatINR,
  formatNumber,
} from "@/lib/format";

export default function InsightsPage() {
  const [data, setData] = useState<InsightsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .insightsSummary()
      .then(setData)
      .catch((e) => setError(String(e?.message || e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Icons.Spinner /> Loading insights…
      </div>
    );
  if (error)
    return (
      <div className="rounded border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
        {error}
      </div>
    );
  if (!data) return null;

  const openCases =
    (data.by_status?.["intake_created"] || 0) +
    (data.by_status?.["in_progress"] || 0) +
    (data.by_status?.["submission_ready"] || 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Anonymized · live"
        title="Insights"
        description="Aggregated metrics across all cases. Updated as agents complete steps."
        right={
          <div className="flex items-center gap-2">
            <span className="text-xxs tabular text-muted">
              as of {formatDateTime(data.as_of)}
            </span>
            <Link href="/intake">
              <Button variant="primary">
                <span className="inline-flex items-center gap-1.5">
                  <Icons.PlusIcon size={12} /> New case
                </span>
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-px overflow-hidden rounded border bg-border md:grid-cols-3">
        <Stat
          label="Open cases"
          value={formatNumber(openCases)}
          hint={`${formatNumber(data.total_cases)} total`}
          className="rounded-none border-0"
        />
        <Stat
          label="High DER cases"
          value={formatNumber(data.high_der_cases)}
          hint="Digital exclusion risk ≥ 0.6"
          tone="warn"
          className="rounded-none border-0"
        />
        <Stat
          label="Estimated benefits unlocked"
          value={formatINR(data.estimated_missed_value_inr)}
          hint="Eligible + probable, not yet sent"
          tone="success"
          className="rounded-none border-0"
        />
        <Stat
          label="Eligible matches"
          value={formatNumber(data.eligible_match_count)}
          className="rounded-none border-0"
        />
        <Stat
          label="Approved packets"
          value={formatNumber(data.approved_packets)}
          className="rounded-none border-0"
        />
        <Stat
          label="Sent packets"
          value={formatNumber(data.sent_packets)}
          tone="success"
          className="rounded-none border-0"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader
            title="Cases by status"
            description="Distribution across the pipeline."
            right={
              <Badge>{data.pending_followups} pending follow-ups</Badge>
            }
          />
          <CardBody className="px-0 py-0">
            {Object.keys(data.by_status).length === 0 ? (
              <div className="px-5 py-6 text-sm text-muted">No cases yet.</div>
            ) : (
              <ul className="dotline-y">
                {Object.entries(data.by_status).map(([k, v]) => (
                  <li
                    key={k}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <span className="text-sm">{k.replaceAll("_", " ")}</span>
                    <span className="font-mono text-sm tabular">{v}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Eligible matches by category"
            description="Across all eligible & probable scheme matches."
          />
          <CardBody>
            <CategoryBars data={data.by_category || {}} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function CategoryBars({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0)
    return (
      <div className="text-sm text-muted">
        No eligible matches recorded yet.
      </div>
    );
  const max = Math.max(...entries.map(([, v]) => v));
  return (
    <ul className="space-y-3">
      {entries.map(([cat, v]) => {
        const pct = max ? (v / max) * 100 : 0;
        return (
          <li key={cat}>
            <div className="flex items-center justify-between text-xs">
              <span className="capitalize tracking-tight">
                {cat.replaceAll("_", " ")}
              </span>
              <span className="font-mono tabular text-muted">{v}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-subtle">
              <div
                className="h-full bg-fg transition-[width] duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
