import type { BlockerReport } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { Badge } from "@/components/ui/badge";

export function BlockersSection({ report }: { report: BlockerReport | null }) {
  if (!report) return null;
  return (
    <Card>
      <CardHeader
        title="Blockers"
        description={`Validator agent for ${report.scheme_id}.`}
        right={
          report.blockers.length === 0 ? (
            <Badge tone="success">submission ready</Badge>
          ) : (
            <Badge tone="warn">{report.blockers.length} to fix</Badge>
          )
        }
      />
      <CardBody>
        {report.blockers.length === 0 ? (
          <div className="text-sm text-muted">No blockers detected.</div>
        ) : (
          <ul className="space-y-2">
            {report.blockers.map((b, i) => (
              <li key={i} className="rounded border bg-subtle/40 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold tracking-tight">
                    {b.type}
                    {b.field ? (
                      <span className="ml-2 font-mono text-xxs text-muted">{b.field}</span>
                    ) : null}
                  </div>
                  {b.severity ? (
                    <Badge tone={b.severity === "high" ? "danger" : "warn"}>
                      {b.severity}
                    </Badge>
                  ) : null}
                </div>
                {b.next_steps?.length ? (
                  <ol className="mt-2 list-decimal space-y-0.5 pl-4 text-xs text-muted">
                    {b.next_steps.map((s, j) => (
                      <li key={j}>{s}</li>
                    ))}
                  </ol>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {report.minimum_path?.length > 0 && (
          <div className="mt-5 rounded border bg-bg px-4 py-3">
            <div className="text-xxs uppercase tracking-tight text-muted">
              Minimum path to submission
            </div>
            <ol className="mt-2 list-decimal space-y-0.5 pl-4 text-sm">
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
