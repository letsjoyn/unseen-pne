"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { CaseDetail } from "@/lib/types";
import { Button, PageHeader, Icons } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { ProfileSection } from "@/components/case/profile-section";
import { MatchesSection } from "@/components/case/matches-section";
import { BlockersSection } from "@/components/case/blockers-section";
import { PacketSection } from "@/components/case/packet-section";
import { RoutingSection } from "@/components/case/routing-section";
import { FollowupsSection } from "@/components/case/followups-section";
import { EventsSection } from "@/components/case/events-section";
import { MissedValueHero } from "@/components/case/missed-value-hero";
import { AgentProgress } from "@/components/case/agent-progress";

export default function CaseDetailPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId as string;

  const [data, setData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pipeline lifecycle: when the page detects an in-flight ADK run we poll
  // every 2s and show the AgentProgress card until "adk.run.end" fires.
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async (silent?: boolean) => {
    try {
      const d = await api.getCase(caseId);
      setData(d);
      const events = d.events || [];
      const started = events.some(
        (e) => e.type === "adk.run.start" || e.type === "pipeline.run.start"
      );
      const ended = events.some(
        (e) =>
          e.type === "adk.run.end" ||
          e.type === "pipeline.run.end" ||
          e.type === "case.error"
      );
      setPipelineRunning(started && !ended);
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll while the pipeline is running. Stops as soon as ADK run.end is seen.
  useEffect(() => {
    if (!pipelineRunning) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    pollRef.current = setInterval(() => {
      refresh(true);
    }, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [pipelineRunning, refresh]);

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
    setPipelineRunning(true);
    try {
      // fire-and-forget; the backend run is synchronous on the server so
      // we just poll events while it's in flight
      api.runFullPipeline(caseId).catch(() => {
        /* errors will surface via case events */
      });
      await refresh(true);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Icons.Spinner /> Loading case…
      </div>
    );
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
  const beneficiaryName =
    data.case.beneficiary_name ||
    (data.case.intake as { beneficiary?: { name?: string } })?.beneficiary
      ?.name ||
    null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={
          <Link href="/cases" className="hover:text-fg">
            ← Cases
          </Link>
        }
        title={
          <span className="flex flex-wrap items-baseline gap-3">
            {beneficiaryName && (
              <span className="font-semibold tracking-tighter">
                {beneficiaryName}
              </span>
            )}
            <span className="font-mono text-base tracking-tight text-muted">
              {data.case.id}
            </span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={data.case.status} />
            <span>·</span>
            <span>operator {data.case.operator_id}</span>
            {data.case.district && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Icons.MapPinIcon size={11} />
                  {data.case.district}
                </span>
              </>
            )}
          </span>
        }
        right={
          <Button onClick={rerun} disabled={busy || pipelineRunning}>
            {pipelineRunning
              ? "Pipeline running…"
              : busy
              ? "Working…"
              : "Re-run pipeline"}
          </Button>
        }
      />

      {pipelineRunning && (
        <AgentProgress events={data.events} done={!pipelineRunning} />
      )}

      <MissedValueHero data={data} />

      <div className="grid gap-6 md:grid-cols-2">
        <ProfileSection profile={data.profile} />
        <MatchesSection matches={data.matches} />
      </div>

      <BlockersSection report={blockerForTop} />

      <PacketSection
        packet={data.packet}
        busy={busy}
        beneficiaryName={beneficiaryName}
        onApprove={approveAndSend}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <RoutingSection plan={data.route_plan} />
        <FollowupsSection tasks={data.followups} />
      </div>

      <EventsSection events={data.events} />
    </div>
  );
}
