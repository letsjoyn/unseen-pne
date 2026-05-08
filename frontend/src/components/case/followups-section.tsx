import type { Followup } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, relativeFromNow } from "@/lib/format";

export function FollowupsSection({ tasks }: { tasks: Followup[] }) {
  return (
    <Card>
      <CardHeader
        title="Follow-ups"
        description="Watchdog scheduled tasks. Cadence comes from the follow-up policy."
        right={<Badge>{tasks.length} tasks</Badge>}
      />
      <CardBody className="px-0 py-0">
        {tasks.length === 0 ? (
          <div className="px-5 py-6 text-sm text-muted">No follow-ups scheduled.</div>
        ) : (
          <ul className="dotline-y">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium tracking-tight">
                    {t.type.replaceAll("_", " ")}
                  </div>
                  <div className="text-xxs text-muted tabular">
                    {formatDateTime(t.due_at)} · {relativeFromNow(t.due_at)}
                  </div>
                </div>
                <Badge tone={t.status === "done" ? "success" : "neutral"}>
                  {t.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
