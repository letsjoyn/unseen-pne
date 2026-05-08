import type { RoutePlan } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { formatLabel } from "@/lib/format";

export function RoutingSection({ plan }: { plan: RoutePlan | null }) {
  if (!plan) return null;
  const primary = plan.primary as { name?: string };
  const fallback = plan.fallback as { name?: string } | null;

  return (
    <Card>
      <CardHeader
        title="Routing"
        description="Channel scoring uses configurable weights from the routing policy."
      />
      <CardBody>
        <div className="grid gap-4 md:grid-cols-2">
          <RouteRow
            label="Primary"
            name={formatLabel(primary?.name)}
            tone="success"
          />
          {fallback && (
            <RouteRow
              label="Fallback"
              name={formatLabel(fallback.name)}
              tone="warn"
            />
          )}
        </div>

        {Object.keys(plan.scores || {}).length > 0 && (
          <div className="mt-5">
            <div className="text-xxs uppercase tracking-tight text-muted">
              Score breakdown
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(plan.scores).map(([k, v]) => (
                <div
                  key={k}
                  className="rounded border bg-bg px-4 py-2.5 transition-colors hover:bg-subtle/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-xxs text-muted">
                      {formatLabel(k)}
                    </div>
                    <div className="text-sm font-semibold tabular">
                      {v.toFixed(2)}
                    </div>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full bg-fg transition-all duration-500"
                      style={{ width: `${Math.min(100, v * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function RouteRow({
  label,
  name,
  tone,
}: {
  label: string;
  name: string;
  tone: "success" | "warn";
}) {
  return (
    <div className="flex items-center justify-between rounded border px-4 py-3">
      <div>
        <div className="text-xxs uppercase tracking-tight text-muted">{label}</div>
        <div className="mt-0.5 font-mono text-sm">{name}</div>
      </div>
      <Badge tone={tone}>{label.toLowerCase()}</Badge>
    </div>
  );
}
