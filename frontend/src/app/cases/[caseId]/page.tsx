"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { CaseDetail } from "@/lib/types";
import { Button, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { ProfileSection } from "@/components/case/profile-section";
import { MatchesSection } from "@/components/case/matches-section";
import { BlockersSection } from "@/components/case/blockers-section";
import { PacketSection } from "@/components/case/packet-section";
import { RoutingSection } from "@/components/case/routing-section";
import { FollowupsSection } from "@/components/case/followups-section";
import { EventsSection } from "@/components/case/events-section";

export default function CaseDetailPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId as string;

  const [data, setData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const d = await api.getCase(caseId);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function approveAndSend(channels: string[]) {
    setBusy(true);
    try {
      await api.approveSendPacket(caseId, { approved_by: "vol_001", channels });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function rerun() {
    setBusy(true);
    try {
      await api.runFullPipeline(caseId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pipeline rerun failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) {
    return <div className="text-sm text-muted">Loading case…</div>;
  }
  if (error) {
    return (
      <div className="rounded border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
        {error}
      </div>
    );
  }
  if (!data) return null;

  const eligible = data.matches.filter((m) => m.eligibility !== "not_eligible");
  const topMatch = eligible[0];
  const blockerForTop = topMatch
    ? data.blockers.find((b) => b.scheme_id === topMatch.scheme_id) || null
    : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={
          <Link href="/cases" className="hover:text-fg">
            ← Cases
          </Link>
        }
        title={
          <span className="font-mono text-2xl tracking-tight">{data.case.id}</span>
        }
        description={
          <span className="flex items-center gap-2">
            <StatusBadge status={data.case.status} />
            <span>·</span>
            <span>operator {data.case.operator_id}</span>
          </span>
        }
        right={
          <Button onClick={rerun} disabled={busy}>
            {busy ? "Working…" : "Re-run pipeline"}
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <ProfileSection profile={data.profile} />
        <MatchesSection matches={data.matches} />
      </div>

      <BlockersSection report={blockerForTop} />

      <PacketSection packet={data.packet} busy={busy} onApprove={approveAndSend} />

      <div className="grid gap-6 md:grid-cols-2">
        <RoutingSection plan={data.route_plan} />
        <FollowupsSection tasks={data.followups} />
      </div>

      <EventsSection events={data.events} />
    </div>
  );
}
