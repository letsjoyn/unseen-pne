"use client";

import type { Packet, PrintRoutingSlip } from "@/lib/types";
import { Card, CardBody, CardHeader, Icons } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export function PrintRoutingSection({
  slip,
  packet,
  printSlipDelivered,
}: {
  slip: PrintRoutingSlip | null | undefined;
  packet?: Packet | null;
  printSlipDelivered?: boolean;
}) {
  if (!slip) return null;

  const hub = slip.recommended_hub || {};
  const sentChannels = packet?.sent_channels || [];
  const isOpen = isHubOpenNow(hub.open_hours);
  const deliveryStatus = printSlipDelivered
    ? "WhatsApp slip delivered"
    : sentChannels.includes("printable_letter")
    ? "Physical handoff queued"
    : "Pending";

  return (
    <Card className="overflow-hidden border-warn/40 bg-[linear-gradient(140deg,rgba(217,119,6,0.12),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]">
      <CardHeader
        title="Last-mile print routing"
        description="When digital delivery would fail, the packet is rerouted to a real-world print hub so the case can still move."
        right={<Badge tone="warn">last-mile solved</Badge>}
      />
      <CardBody className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-lg border border-warn/30 bg-bg/80 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="fg">nearest print hub</Badge>
              {hub.category && <Badge>{hub.category.replaceAll("_", " ")}</Badge>}
              {isOpen != null && (
                <Badge tone={isOpen ? "success" : "danger"}>
                  {isOpen ? "open now" : "closed now"}
                </Badge>
              )}
            </div>
            <div className="mt-3 flex items-start gap-3">
              <div className="rounded-full border border-warn/30 bg-warn/10 p-2 text-warn">
                <Icons.MapPinIcon size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-semibold tracking-tight text-fg">
                  {hub.name || "Recommended print hub"}
                </div>
                {hub.address && (
                  <div className="mt-1 text-sm leading-relaxed text-muted">
                    {hub.address}
                  </div>
                )}
                {(hub.district || hub.state) && (
                  <div className="mt-1 text-xs uppercase tracking-tight text-muted">
                    {[hub.district, hub.state].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-muted md:grid-cols-2">
              <div className="rounded border bg-subtle/20 px-3 py-2">
                <div className="text-xxs uppercase tracking-tight text-muted">
                  Trigger
                </div>
                <div className="mt-1 font-medium text-fg">{slip.reason}</div>
              </div>
              <div className="rounded border bg-subtle/20 px-3 py-2">
                <div className="text-xxs uppercase tracking-tight text-muted">
                  Open hours
                </div>
                <div className="mt-1 font-medium text-fg">
                  {hub.open_hours || "Hours not listed"}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-bg/80 px-4 py-4">
            <div className="text-xxs uppercase tracking-tight text-muted">
              Delivery status
            </div>
            <div className="mt-3 space-y-3">
              <StatusRow
                label="Physical packet"
                value={
                  sentChannels.includes("printable_letter")
                    ? "Queued for print handoff"
                    : "Not queued"
                }
                active={sentChannels.includes("printable_letter")}
              />
              <StatusRow
                label="WhatsApp routing"
                value={deliveryStatus}
                active={!!printSlipDelivered}
              />
              <StatusRow
                label="Maps handoff"
                value={hub.maps_query || "Hub lookup attached"}
                active={!!hub.maps_query}
                mono={!!hub.maps_query}
              />
            </div>
            <div className="mt-4 rounded border border-success/30 bg-success/10 px-3 py-3 text-sm text-success">
              Volunteer no longer needs the resident to be online. The packet can be carried the last mile physically.
            </div>
          </div>
        </div>

        <div className="rounded border bg-subtle/20 px-4 py-3">
          <div className="text-xxs uppercase tracking-tight text-muted">
            Volunteer handoff steps
          </div>
          <ul className="mt-3 grid gap-2 md:grid-cols-3">
            {slip.instructions.map((instruction, index) => (
              <li
                key={instruction}
                className="rounded border bg-bg/80 px-3 py-3 text-sm"
              >
                <div className="mb-2 flex items-center gap-2 text-xxs uppercase tracking-tight text-muted">
                  <span
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full border",
                      index === 0
                        ? "border-fg bg-fg text-bg"
                        : "border-border bg-subtle text-fg"
                    )}
                  >
                    {index + 1}
                  </span>
                  Step
                </div>
                <div className="leading-relaxed text-fg">{instruction}</div>
              </li>
            ))}
          </ul>
          {hub.maps_query && (
            <div className="mt-3 text-xxs text-muted">
              Maps query:{" "}
              <span className="font-mono text-fg">{hub.maps_query}</span>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function StatusRow({
  label,
  value,
  active,
  mono,
}: {
  label: string;
  value: string;
  active: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded border bg-subtle/20 px-3 py-2">
      <div>
        <div className="text-xxs uppercase tracking-tight text-muted">{label}</div>
        <div className={cn("mt-1 text-sm text-fg", mono && "font-mono text-xs")}>
          {value}
        </div>
      </div>
      <div
        className={cn(
          "mt-1 h-2.5 w-2.5 rounded-full",
          active ? "bg-success" : "bg-border"
        )}
      />
    </div>
  );
}

function isHubOpenNow(hours: string | undefined): boolean | null {
  if (!hours) return null;
  const match = hours.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [, startHour, startMinute, endHour, endMinute] = match;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = Number(startHour) * 60 + Number(startMinute);
  const endMinutes = Number(endHour) * 60 + Number(endMinute);
  if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) return null;
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}
