"use client";

import type { Blocker, BlockerReport } from "@/lib/types";
import { Card, CardBody, CardHeader, Icons } from "@/components/ui";
import { Badge } from "@/components/ui/badge";

export function BlockersSection({ report }: { report: BlockerReport | null }) {
  if (!report) return null;
  const open = report.blockers.length;
  return (
    <Card>
      <CardHeader
        title="Blockers"
        description={
          <>
            Validator agent for{" "}
            <span className="font-medium text-fg">
              {report.scheme_name || report.scheme_id}
            </span>
            <span className="ml-2 font-mono text-xxs text-muted">
              {report.scheme_id}
            </span>
          </>
        }
        right={
          open === 0 ? (
            <Badge tone="success">submission ready</Badge>
          ) : (
            <Badge tone={open >= 2 ? "danger" : "warn"}>{open} to fix</Badge>
          )
        }
      />
      <CardBody>
        {open === 0 ? (
          <div className="text-sm text-muted">
            No blockers detected — minimum path complete.
          </div>
        ) : (
          <ul className="space-y-2">
            {report.blockers.map((b, i) => (
              <BlockerRow key={i} b={b} />
            ))}
          </ul>
        )}

        {report.minimum_path?.length > 0 && (
          <div className="mt-5 rounded border bg-bg px-4 py-3">
            <div className="flex items-center gap-2 text-xxs uppercase tracking-tight text-muted">
              <Icons.ChecklistIcon size={12} />
              Minimum path to submission
            </div>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed">
              {report.minimum_path.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function BlockerRow({ b }: { b: Blocker }) {
  const sev =
    b.severity === "high"
      ? "danger"
      : b.severity === "medium"
      ? "warn"
      : "neutral";
  const titleParts = [b.type.replaceAll("_", " ")];
  if (b.field) titleParts.push(b.field);

  const mapsHref = b.office?.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        b.office.address
      )}`
    : b.office?.name
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        b.office.name
      )}`
    : null;

  return (
    <li className="rounded border bg-subtle/40 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                sev === "danger"
                  ? "text-sm font-semibold tracking-tight text-danger"
                  : "text-sm font-semibold tracking-tight"
              }
            >
              {titleParts.join(" · ")}
            </span>
            {b.severity && <Badge tone={sev}>{b.severity}</Badge>}
          </div>
          {b.description && (
            <div className="mt-1 text-xs text-muted leading-relaxed">
              {b.description}
            </div>
          )}
        </div>
      </div>

      {b.next_steps?.length ? (
        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs">
          {b.next_steps.map((s, j) => (
            <li key={j} className="text-fg/90">
              {s}
            </li>
          ))}
        </ol>
      ) : null}

      {b.required_items && b.required_items.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="text-xxs uppercase tracking-tight text-muted">
            Bring:
          </span>
          {b.required_items.map((it) => (
            <span
              key={it}
              className="rounded border border-border bg-bg px-1.5 py-0.5 text-xxs uppercase tracking-tight text-muted"
            >
              {it.replaceAll("_", " ")}
            </span>
          ))}
        </div>
      )}

      {b.office && (b.office.name || b.office.address) && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded border bg-bg px-3 py-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xxs uppercase tracking-tight text-muted">
              <Icons.MapPinIcon size={11} />
              Nearest office
            </div>
            <div className="mt-0.5 text-xs">
              {b.office.name && (
                <span className="font-medium">{b.office.name}</span>
              )}
              {b.office.address && (
                <span className="text-muted">
                  {b.office.name ? " · " : ""}
                  {b.office.address}
                </span>
              )}
              {b.office.distance_km != null && (
                <span className="ml-1.5 font-mono text-xxs tabular text-muted">
                  ({b.office.distance_km.toFixed(1)} km)
                </span>
              )}
            </div>
          </div>
          {mapsHref && (
            <a
              href={mapsHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded border border-fg bg-fg px-2.5 py-1 text-xxs uppercase tracking-tight text-bg hover:opacity-90"
            >
              Get directions
              <Icons.ArrowRightIcon size={11} />
            </a>
          )}
        </div>
      )}
    </li>
  );
}
