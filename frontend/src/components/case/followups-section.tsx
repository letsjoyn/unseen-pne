import type { Followup } from "@/lib/types";
import { Card, CardBody, CardHeader, Icons } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, relativeFromNow } from "@/lib/format";
import { cn } from "@/lib/cn";

function statusTone(status: string): "success" | "warn" | "danger" | "neutral" {
  if (status === "done" || status === "completed") return "success";
  if (status === "escalated" || status === "failed") return "danger";
  if (status === "pending" || status === "queued") return "warn";
  return "neutral";
}

function channelIcon(type: string) {
  if (type.toLowerCase().includes("email"))
    return <Icons.MailIcon size={12} />;
  if (type.toLowerCase().includes("phone") || type.toLowerCase().includes("call"))
    return <Icons.ClockIcon size={12} />;
  return <Icons.ClockIcon size={12} />;
}

export function FollowupsSection({ tasks }: { tasks: Followup[] }) {
  return (
    <Card>
      <CardHeader
        title="Follow-up timeline"
        description="Watchdog auto-schedules tasks. Cadence comes from the follow-up policy."
        right={<Badge>{tasks.length} tasks</Badge>}
      />
      <CardBody className="px-0 py-0">
        {tasks.length === 0 ? (
          <div className="px-5 py-6 text-sm text-muted">
            No follow-ups scheduled.
          </div>
        ) : (
          <ol className="relative px-5 py-4">
            <span
              className="absolute left-[26px] top-5 bottom-5 w-px bg-border"
              aria-hidden
            />
            {tasks.map((t, i) => {
              const tone = statusTone(t.status);
              const isDone = t.status === "done" || t.status === "completed";
              return (
                <li
                  key={t.id}
                  className={cn(
                    "relative flex items-start gap-3 py-2.5",
                    i > 0 && "mt-1"
                  )}
                >
                  <div className="relative z-10 mt-0.5 flex h-5 w-5 items-center justify-center">
                    <span
                      className={cn(
                        "flex h-3 w-3 items-center justify-center rounded-full border",
                        isDone
                          ? "border-fg bg-fg"
                          : tone === "warn"
                          ? "border-fg bg-bg"
                          : "border-border bg-bg"
                      )}
                    >
                      {isDone && (
                        <span className="text-bg">
                          <Icons.CheckIcon size={9} />
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 rounded border bg-bg px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-sm font-medium tracking-tight">
                        {channelIcon(t.type)}
                        <span>{t.type.replaceAll("_", " ")}</span>
                      </div>
                      <Badge tone={tone}>{t.status}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xxs text-muted tabular">
                      <span>{formatDateTime(t.due_at)}</span>
                      <span>·</span>
                      <span>{relativeFromNow(t.due_at)}</span>
                    </div>
                    {t.notes && (
                      <div className="mt-1 text-xs text-muted">{t.notes}</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}
