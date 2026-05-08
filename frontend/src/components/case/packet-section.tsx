"use client";

import { useEffect, useMemo, useState } from "react";
import type { Packet } from "@/lib/types";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Icons,
  Modal,
  Tabs,
  type TabItem,
} from "@/components/ui";
import { Badge } from "@/components/ui/badge";

type ChannelChoice = "email" | "printable_letter";

export function PacketSection({
  packet,
  busy,
  beneficiaryName,
  onApprove,
}: {
  packet: Packet | null;
  busy: boolean;
  beneficiaryName?: string | null;
  onApprove: (channels: string[]) => void;
}) {
  const [tab, setTab] = useState<"email" | "letter" | "checklist">("email");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingChannels, setPendingChannels] = useState<ChannelChoice[]>([]);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  // Auto-expand the most relevant tab when packet arrives
  useEffect(() => {
    if (!packet) return;
    if (!packet.email_body && packet.cover_letter) setTab("letter");
  }, [packet]);

  const checklistTotal = packet?.checklist.length || 0;
  const checklistDone = useMemo(
    () =>
      Object.entries(checkedItems).filter(
        ([k, v]) => v && Number(k) < checklistTotal
      ).length,
    [checkedItems, checklistTotal]
  );
  const ready = checklistTotal === 0 || checklistDone === checklistTotal;

  if (!packet) return null;

  const tabs: TabItem[] = [
    {
      id: "email",
      label: (
        <span className="inline-flex items-center gap-1.5">
          <Icons.MailIcon size={12} />
          Email draft
        </span>
      ),
    },
    {
      id: "letter",
      label: (
        <span className="inline-flex items-center gap-1.5">
          <Icons.FileTextIcon size={12} />
          Cover letter
        </span>
      ),
    },
    {
      id: "checklist",
      label: (
        <span className="inline-flex items-center gap-1.5">
          <Icons.ChecklistIcon size={12} />
          Checklist
        </span>
      ),
      badge: (
        <span className="font-mono tabular text-muted">
          {checklistDone}/{checklistTotal}
        </span>
      ),
    },
  ];

  function requestApprove(channels: ChannelChoice[]) {
    setPendingChannels(channels);
    setConfirmOpen(true);
  }

  function confirmApprove() {
    setConfirmOpen(false);
    onApprove(pendingChannels);
  }

  return (
    <Card>
      <CardHeader
        title="Action packet"
        description={
          <>
            Drafted by Closer for{" "}
            <span className="font-medium text-fg">
              {packet.scheme_name || packet.scheme_id}
            </span>
            <span className="ml-2 font-mono text-xxs text-muted">
              {packet.scheme_id}
            </span>{" "}
            · human approval required.
          </>
        }
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
      <CardBody className="space-y-4">
        <Tabs items={tabs} active={tab} onChange={(t) => setTab(t as typeof tab)} />

        {tab === "email" && (
          <div className="space-y-3">
            <div>
              <div className="text-xxs uppercase tracking-tight text-muted">
                Subject
              </div>
              <div className="mt-1 rounded border bg-subtle/40 px-3 py-2 text-sm">
                {packet.email_subject}
              </div>
            </div>
            <div>
              <div className="text-xxs uppercase tracking-tight text-muted">
                Body
              </div>
              <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap rounded border bg-subtle/40 px-4 py-3 text-xs leading-relaxed">
                {packet.email_body}
              </pre>
            </div>
          </div>
        )}

        {tab === "letter" && (
          <div>
            <div className="text-xxs uppercase tracking-tight text-muted">
              Cover letter (printable)
            </div>
            <pre className="mt-1 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded border bg-subtle/40 px-4 py-3 text-xs leading-relaxed">
              {packet.cover_letter}
            </pre>
          </div>
        )}

        {tab === "checklist" && (
          <div>
            <div className="flex items-center justify-between text-xxs uppercase tracking-tight text-muted">
              <span>Document checklist</span>
              <span className="font-mono tabular">
                {checklistDone}/{checklistTotal} ready
              </span>
            </div>
            <ul className="mt-2 divide-y divide-border rounded border">
              {packet.checklist.map((x, i) => {
                const checked = !!checkedItems[i];
                return (
                  <li
                    key={i}
                    className="flex items-start gap-3 px-3 py-2 text-sm"
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() =>
                        setCheckedItems((s) => ({ ...s, [i]: !s[i] }))
                      }
                      className={
                        checked
                          ? "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-fg bg-fg text-bg"
                          : "mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-border bg-bg"
                      }
                    >
                      {checked && <Icons.CheckIcon size={11} />}
                    </button>
                    <span className={checked ? "text-muted line-through" : ""}>
                      {x}
                    </span>
                  </li>
                );
              })}
            </ul>
            {checklistTotal > 0 && !ready && (
              <div className="mt-2 text-xxs text-muted">
                Tick off all items to enable approve & send.
              </div>
            )}
          </div>
        )}

        {!packet.sent && (
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button
              variant="primary"
              onClick={() => requestApprove(["email", "printable_letter"])}
              disabled={busy || !ready}
            >
              {busy ? "Working…" : "Approve & send (email)"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => requestApprove(["printable_letter"])}
              disabled={busy}
            >
              Approve (printable only)
            </Button>
            {!ready && (
              <span className="self-center text-xxs text-muted">
                Checklist gate · {checklistDone}/{checklistTotal}
              </span>
            )}
          </div>
        )}
      </CardBody>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm send"
        description={
          beneficiaryName
            ? `You are about to send this on behalf of ${beneficiaryName}.`
            : "You are about to send this on behalf of the beneficiary."
        }
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmApprove} disabled={busy}>
              {busy ? "Sending…" : "Confirm send"}
            </Button>
          </>
        }
      >
        <ul className="space-y-1.5">
          <li className="flex items-center gap-2">
            <Icons.MailIcon size={13} />
            <span className="font-mono text-xxs tabular text-muted">
              channels:
            </span>
            <span className="text-xs">{pendingChannels.join(", ")}</span>
          </li>
          <li className="flex items-center gap-2">
            <Icons.FileTextIcon size={13} />
            <span className="font-mono text-xxs tabular text-muted">
              scheme:
            </span>
            <span className="text-xs">
              {packet.scheme_name || packet.scheme_id}
            </span>
          </li>
        </ul>
        <p className="mt-3 text-xxs text-muted">
          This action is audit-logged and can&apos;t be undone after the email
          is dispatched.
        </p>
      </Modal>
    </Card>
  );
}
