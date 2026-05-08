"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatINR, formatDateTime } from "@/lib/format";
import type { CaseSummary } from "@/lib/types";
import {
  Badge,
  Button,
  Icons,
  PageHeader,
  Table,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/cn";

type DerBucket = "all" | "high" | "medium" | "low" | "unknown";

const DER_TONES: Record<DerBucket, "danger" | "warn" | "success" | "neutral"> = {
  all: "neutral",
  high: "danger",
  medium: "warn",
  low: "success",
  unknown: "neutral",
};

function derBucket(score?: number | null): DerBucket {
  if (score == null) return "unknown";
  if (score >= 0.6) return "high";
  if (score >= 0.3) return "medium";
  return "low";
}

export default function AdminCasesPage() {
  const { session } = useAuth();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [derFilter, setDerFilter] = useState<DerBucket>("all");

  useEffect(() => {
    api
      .listCases()
      .then(setCases)
      .catch((e) => setError(String(e?.message || e)))
      .finally(() => setLoading(false));
  }, []);

  const statuses = useMemo(() => {
    const s = new Set<string>();
    cases.forEach((c) => s.add(c.status));
    return Array.from(s).sort();
  }, [cases]);

  const totals = useMemo(() => {
    const totalMissed = cases.reduce(
      (acc, c) => acc + (c.missed_value_inr || 0),
      0
    );
    const open = cases.filter(
      (c) => c.status !== "packet_dispatched" && c.status !== "closed"
    ).length;
    const highDer = cases.filter((c) => derBucket(c.der_score) === "high")
      .length;
    return { totalMissed, open, highDer, total: cases.length };
  }, [cases]);

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (derFilter !== "all" && derBucket(c.der_score) !== derFilter)
        return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const inId = c.case_id.toLowerCase().includes(q);
        const inName = (c.beneficiary_name || "").toLowerCase().includes(q);
        const inDist = (c.district || "").toLowerCase().includes(q);
        if (!inId && !inName && !inDist) return false;
      }
      return true;
    });
  }, [cases, search, statusFilter, derFilter]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Admin · ${session?.org || ""}`}
        title="All cases"
        description="Cross-org operations view. Volunteer names are visible here so admins can route or escalate."
        right={
          <Link href="/intake">
            <Button variant="primary">
              <span className="inline-flex items-center gap-1.5">
                <Icons.PlusIcon size={12} /> New intake
              </span>
            </Button>
          </Link>
        }
      />

      <div className="grid gap-px overflow-hidden rounded border bg-border md:grid-cols-4">
        <KpiTile label="Total cases" value={totals.total.toString()} />
        <KpiTile label="Open" value={totals.open.toString()} />
        <KpiTile
          label="High DER"
          value={totals.highDer.toString()}
          tone="warn"
        />
        <KpiTile
          label="Missed value (sum)"
          value={formatINR(totals.totalMissed)}
          tone="success"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Icons.SearchIcon
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by id, name, district…"
            className="h-8 w-64 rounded border border-border bg-bg pl-7 pr-2 text-xs placeholder:text-muted focus:border-fg focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 rounded border border-border bg-bg px-2 text-xs focus:border-fg focus:outline-none"
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>

        <div className="inline-flex items-center rounded border border-border bg-bg p-0.5 text-xxs">
          {(["all", "high", "medium", "low", "unknown"] as DerBucket[]).map(
            (b) => (
              <button
                key={b}
                onClick={() => setDerFilter(b)}
                className={cn(
                  "rounded px-2 py-1 uppercase tracking-tight transition-colors",
                  derFilter === b
                    ? "bg-fg text-bg"
                    : "text-muted hover:text-fg"
                )}
              >
                {b === "all" ? "DER all" : `DER ${b}`}
              </button>
            )
          )}
        </div>

        <div className="ml-auto text-xxs text-muted tabular">
          {loading ? "Loading…" : `${filtered.length} of ${cases.length} cases`}
        </div>
      </div>

      {loading ? (
        <div className="rounded border bg-subtle px-6 py-10 text-center text-sm text-muted">
          Loading…
        </div>
      ) : error ? (
        <div className="rounded border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded border bg-subtle px-6 py-10 text-center text-sm text-muted">
          No cases match the current filters.
        </div>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Case</TH>
              <TH>Resident</TH>
              <TH>Operator</TH>
              <TH>Status</TH>
              <TH>DER</TH>
              <TH align="right">Eligible</TH>
              <TH align="right">Missed value</TH>
              <TH align="right">Created</TH>
            </TR>
          </THead>
          <tbody>
            {filtered.map((c) => {
              const bucket = derBucket(c.der_score);
              return (
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
                    <div className="text-sm">{c.beneficiary_name || "—"}</div>
                    {c.district && (
                      <div className="text-xxs text-muted">{c.district}</div>
                    )}
                  </TD>
                  <TD className="font-mono text-xxs text-muted">
                    {c.operator_id}
                  </TD>
                  <TD>
                    <StatusBadge status={c.status} />
                  </TD>
                  <TD>
                    <Badge tone={DER_TONES[bucket]}>
                      {bucket === "unknown" ? "—" : `DER ${bucket}`}
                      {c.der_score != null && (
                        <span className="ml-1 font-mono opacity-80 tabular">
                          {(c.der_score * 100).toFixed(0)}
                        </span>
                      )}
                    </Badge>
                  </TD>
                  <TD align="right" className="tabular text-muted">
                    {c.eligible_count ?? 0}
                    <span className="text-xxs"> / {c.total_matches ?? 0}</span>
                  </TD>
                  <TD align="right" className="tabular">
                    {c.missed_value_inr ? formatINR(c.missed_value_inr) : "—"}
                  </TD>
                  <TD align="right" className="tabular text-muted">
                    {formatDateTime(c.created_at)}
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}

function KpiTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warn";
}) {
  return (
    <div className="bg-bg px-5 py-4">
      <div className="text-xxs uppercase tracking-tight text-muted">{label}</div>
      <div
        className={cn(
          "mt-2 text-xl font-semibold tabular tracking-tight",
          tone === "success" && "text-success",
          tone === "warn" && "text-warn"
        )}
      >
        {value}
      </div>
    </div>
  );
}
