"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  Badge,
  Icons,
  PageHeader,
  Table,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

type SchemeRow = {
  id: string;
  name: string;
  level: string;
  state?: string | null;
  category: string;
  version: number;
  active: boolean;
  last_verified_at: string | null;
  source_url: string;
};

export default function AdminSchemesPage() {
  const [rows, setRows] = useState<SchemeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<string>("all");

  useEffect(() => {
    api
      .listSchemes()
      .then((r) => setRows(r as unknown as SchemeRow[]))
      .catch((e) => setError(String(e?.message || e)))
      .finally(() => setLoading(false));
  }, []);

  const levels = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.level));
    return Array.from(set);
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (level !== "all" && r.level !== level) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !r.id.toLowerCase().includes(q) &&
          !r.name.toLowerCase().includes(q) &&
          !r.category.toLowerCase().includes(q) &&
          !(r.state || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [rows, search, level]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin · scheme registry"
        title="Schemes"
        description="The single source of truth for matchable benefits. Eligibility lives in JSONLogic rules per row — no hardcoded logic in agents."
        right={
          <span className="inline-flex items-center gap-1.5 text-xxs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {rows.length} active rows
          </span>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Icons.SearchIcon
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search id, name, category…"
            className="h-8 w-72 rounded border border-border bg-bg pl-7 pr-2 text-xs placeholder:text-muted focus:border-fg focus:outline-none"
          />
        </div>
        <div className="inline-flex items-center rounded border border-border bg-bg p-0.5 text-xxs">
          {(["all", ...levels] as string[]).map((b) => (
            <button
              key={b}
              onClick={() => setLevel(b)}
              className={cn(
                "rounded px-2 py-1 uppercase tracking-tight transition-colors",
                level === b ? "bg-fg text-bg" : "text-muted hover:text-fg"
              )}
            >
              {b}
            </button>
          ))}
        </div>
        <div className="ml-auto text-xxs text-muted tabular">
          {filtered.length} of {rows.length}
        </div>
      </div>

      {loading ? (
        <div className="rounded border bg-subtle px-6 py-10 text-center text-sm text-muted">
          Loading registry…
        </div>
      ) : error ? (
        <div className="rounded border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>ID</TH>
              <TH>Name</TH>
              <TH>Level</TH>
              <TH>State</TH>
              <TH>Category</TH>
              <TH align="right">Version</TH>
              <TH align="right">Verified</TH>
              <TH>Source</TH>
            </TR>
          </THead>
          <tbody>
            {filtered.map((r) => (
              <TR key={r.id} className="hover:bg-subtle">
                <TD mono>
                  <span className="font-medium text-fg">{r.id}</span>
                </TD>
                <TD>{r.name}</TD>
                <TD>
                  <Badge>{r.level}</Badge>
                </TD>
                <TD className="text-muted">{r.state || "—"}</TD>
                <TD className="text-muted capitalize">
                  {r.category.replaceAll("_", " ")}
                </TD>
                <TD align="right" className="tabular">
                  v{r.version}
                </TD>
                <TD align="right" className="tabular text-muted">
                  {r.last_verified_at
                    ? formatDateTime(r.last_verified_at).slice(0, 10)
                    : "—"}
                </TD>
                <TD>
                  <a
                    href={r.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-fg underline-offset-2 hover:underline"
                  >
                    <Icons.FileTextIcon size={11} />
                    open
                  </a>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
