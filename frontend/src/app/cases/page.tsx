"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { CaseSummary } from "@/lib/types";
import { Button, PageHeader, Table, TD, TH, THead, TR } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";

export default function CasesPage() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listCases()
      .then(setCases)
      .catch((e) => setError(String(e?.message || e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Cases"
        description="Every case shows its current pipeline state. Click to inspect agent decisions and approve outbound packets."
        right={
          <Link href="/intake">
            <Button variant="primary">New intake</Button>
          </Link>
        }
      />

      {loading ? (
        <SkeletonRows />
      ) : error ? (
        <div className="rounded border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : cases.length === 0 ? (
        <EmptyState />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Case</TH>
              <TH>Status</TH>
              <TH>Operator</TH>
              <TH align="right">Created</TH>
            </TR>
          </THead>
          <tbody>
            {cases.map((c) => (
              <TR key={c.case_id} className="hover:bg-subtle">
                <TD mono>
                  <Link
                    href={`/cases/${c.case_id}`}
                    className="font-medium text-fg hover:underline underline-offset-2"
                  >
                    {c.case_id}
                  </Link>
                </TD>
                <TD>
                  <StatusBadge status={c.status} />
                </TD>
                <TD className="text-muted">{c.operator_id}</TD>
                <TD align="right" className="tabular text-muted">
                  {formatDateTime(c.created_at)}
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded border bg-subtle px-6 py-12 text-center">
      <div className="text-sm font-medium">No cases yet</div>
      <p className="mt-1 text-xs text-muted">
        Create the first one from the intake page.
      </p>
      <div className="mt-4">
        <Link href="/intake">
          <Button variant="primary">Create case</Button>
        </Link>
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="overflow-hidden rounded border">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between border-b border-border/70 px-4 py-3 last:border-b-0"
        >
          <div className="h-3 w-32 animate-pulse rounded bg-subtle" />
          <div className="h-3 w-16 animate-pulse rounded bg-subtle" />
          <div className="h-3 w-24 animate-pulse rounded bg-subtle" />
          <div className="h-3 w-28 animate-pulse rounded bg-subtle" />
        </div>
      ))}
    </div>
  );
}
