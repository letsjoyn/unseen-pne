"use client";

import type { Packet } from "@/lib/types";
import { Button, Card, CardBody, CardHeader } from "@/components/ui";
import { Badge } from "@/components/ui/badge";

export function PacketSection({
  packet,
  busy,
  onApprove,
}: {
  packet: Packet | null;
  busy: boolean;
  onApprove: (channels: string[]) => void;
}) {
  if (!packet) return null;
  return (
    <Card>
      <CardHeader
        title="Action packet"
        description={`Drafted by Closer for ${packet.scheme_id}. Human approval required before send.`}
        right={
          <div className="flex items-center gap-1.5">
            {packet.approved ? (
              <Badge tone="success">approved</Badge>
            ) : (
              <Badge tone="warn">awaiting approval</Badge>
            )}
            {packet.sent && <Badge tone="success">sent</Badge>}
          </div>
        }
      />
      <CardBody className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xxs uppercase tracking-tight text-muted">
              Email subject
            </div>
            <div className="mt-1 rounded border bg-subtle/40 px-3 py-2 text-sm">
              {packet.email_subject}
            </div>

            <div className="mt-4 text-xxs uppercase tracking-tight text-muted">
              Email body
            </div>
            <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded border bg-subtle/40 px-3 py-2 text-xs leading-relaxed">
              {packet.email_body}
            </pre>
          </div>

          <div>
            <div className="text-xxs uppercase tracking-tight text-muted">
              Cover letter
            </div>
            <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded border bg-subtle/40 px-3 py-2 text-xs leading-relaxed">
              {packet.cover_letter}
            </pre>

            <div className="mt-4 text-xxs uppercase tracking-tight text-muted">
              Document checklist
            </div>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
              {packet.checklist.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        </div>

        {!packet.sent && (
          <div className="flex flex-wrap gap-2 border-t pt-5">
            <Button
              variant="primary"
              onClick={() => onApprove(["email", "printable_letter"])}
              disabled={busy}
            >
              {busy ? "Working…" : "Approve + send (email)"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => onApprove(["printable_letter"])}
              disabled={busy}
            >
              Approve (printable only)
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
