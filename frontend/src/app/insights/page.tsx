"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { InsightsSummary } from "@/lib/types";
import { Card, CardBody, CardHeader, PageHeader, Stat } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatINR, formatNumber } from "@/lib/format";

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

  if (loading) return <div className="text-sm text-muted">Loading insights…</div>;
  if (error)
    return (
      <div className="rounded border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
        {error}
      </div>
    );
  if (!data) return null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Anonymized · live"
        title="Insights"
        description="Aggregated metrics across all cases. Updated as agents complete steps."
        right={
          <span className="text-xxs tabular text-muted">
            as of {formatDateTime(data.as_of)}
          </span>
        }
      />

      <div className="grid gap-px overflow-hidden rounded border bg-border md:grid-cols-3">
        <Stat
          label="Total cases"
          value={formatNumber(data.total_cases)}
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
          label="Estimated missed value"
          value={formatINR(data.estimated_missed_value_inr)}
          hint="Eligible + probable matches not yet sent"
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

      <Card>
        <CardHeader
          title="Cases by status"
          description="Distribution across the pipeline."
          right={<Badge>{data.pending_followups} pending follow-ups</Badge>}
        />
        <CardBody className="px-0 py-0">
          {Object.keys(data.by_status).length === 0 ? (
            <div className="px-5 py-6 text-sm text-muted">No cases yet.</div>
          ) : (
            <ul className="dotline-y">
              {Object.entries(data.by_status).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm">{k.replaceAll("_", " ")}</span>
                  <span className="font-mono text-sm tabular">{v}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
