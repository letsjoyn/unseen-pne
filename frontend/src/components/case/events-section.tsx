import type { CaseEvent } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { formatTime } from "@/lib/format";

export function EventsSection({ events }: { events: CaseEvent[] }) {
  return (
    <Card>
      <CardHeader
        title="Audit trail"
        description="Every agent invocation and state transition, in order."
      />
      <CardBody className="px-0 py-0">
        {events.length === 0 ? (
          <div className="px-5 py-6 text-sm text-muted">No events recorded.</div>
        ) : (
          <ul className="dotline-y font-mono text-xxs">
            {events.map((e, i) => (
              <li
                key={i}
                className="grid grid-cols-[5rem_1fr_auto] items-center gap-3 px-5 py-2"
              >
                <span className="tabular text-muted">{formatTime(e.at)}</span>
                <span className="truncate">{e.type}</span>
                <span className="text-muted">{e.actor}</span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
