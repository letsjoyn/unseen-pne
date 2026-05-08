"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { CaseDetail } from "@/lib/types";
import { formatDateTime, formatINR, formatPct, relativeFromNow } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button, Card, CardBody, Icons, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { ProfileSection } from "@/components/case/profile-section";
import { HouseholdSection } from "@/components/case/household-section";
import { MatchesSection } from "@/components/case/matches-section";
import { BlockersSection } from "@/components/case/blockers-section";
import { PacketSection } from "@/components/case/packet-section";
import { PrintRoutingSection } from "@/components/case/print-routing-section";
import { RoutingSection } from "@/components/case/routing-section";
import { FollowupsSection } from "@/components/case/followups-section";
import { EventsSection } from "@/components/case/events-section";
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
  const latestPacketEvent = [...data.events]
    .reverse()
    .find((event) => event.type === "packet.approved_sent");
  const printSlipDelivered = Boolean(
    latestPacketEvent?.payload?.print_slip_delivery
  );

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

      <CaseDemoHero data={data} beneficiaryName={beneficiaryName} />

      <JourneyStrip data={data} />

      <ParallelSwarmSection data={data} beneficiaryName={beneficiaryName} />

      <div className="grid gap-6 md:grid-cols-2">
        <ProfileSection profile={data.profile} />
        <MatchesSection matches={data.matches} />
      </div>

      <HouseholdSection
        householdMembers={data.household_members}
        profile={data.profile}
      />

      <BlockersSection report={blockerForTop} />

      <PacketSection
        packet={data.packet}
        busy={busy}
        beneficiaryName={beneficiaryName}
        onApprove={approveAndSend}
      />

      <PrintRoutingSection
        slip={data.print_routing_slip}
        packet={data.packet}
        printSlipDelivered={printSlipDelivered}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <RoutingSection plan={data.route_plan} />
        <FollowupsSection tasks={data.followups} />
      </div>

      <EventsSection events={data.events} />
    </div>
  );
}

function CaseDemoHero({
  data,
  beneficiaryName,
}: {
  data: CaseDetail;
  beneficiaryName: string | null;
}) {
  const intake = (data.case.intake as { beneficiary?: Record<string, unknown> })?.beneficiary || {};
  const topEligible = data.matches.filter((m) => m.eligibility !== "not_eligible");
  const swarmPlan = data.profile?.household_swarm_plan;
  const householdCeiling = swarmPlan?.household_benefit_ceiling_inr ?? 0;
  const totalCeiling = (data.missed_value_inr ?? 0) + householdCeiling;
  const der = data.profile?.der_score ?? null;
  const derTone = der == null ? "neutral" : der >= 0.6 ? "danger" : der >= 0.3 ? "warn" : "success";
  const followup = data.followups[0];
  const hasPrintRoute = !!data.print_routing_slip;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.12),transparent_28%),radial-gradient(circle_at_75%_15%,rgba(22,163,74,0.10),transparent_24%),linear-gradient(180deg,rgba(17,17,17,0.02),transparent)] px-5 py-5 md:px-7 md:py-7">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(17,17,17,0.3),transparent)]" />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="fg">Household benefit ceiling</Badge>
            {hasPrintRoute && <Badge tone="warn">last-mile solved</Badge>}
            {data.eligibility_pulse && <Badge tone="success">living eligibility pulse</Badge>}
          </div>
          <div>
            <div className="max-w-3xl text-3xl font-semibold tracking-tighter md:text-5xl">
              {formatINR(totalCeiling)}
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
              {beneficiaryName || "This household"} can move from blocked discovery to coordinated delivery across the primary resident and any dependent opportunities. The UI now shows the transformation in one scan.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <HeroMetric
              label="Primary path"
              value={formatINR(data.missed_value_inr ?? 0)}
              detail={`${topEligible.length} active match${topEligible.length === 1 ? "" : "es"}`}
            />
            <HeroMetric
              label="Household lift"
              value={formatINR(householdCeiling)}
              detail={`${swarmPlan?.swarms.length || 0} parallel swarm${swarmPlan?.swarms.length === 1 ? "" : "s"}`}
            />
            <HeroMetric
              label="Follow-up"
              value={followup ? relativeFromNow(followup.due_at) : "none"}
              detail={followup ? formatDateTime(followup.due_at) : "No tasks queued"}
            />
          </div>
          <div className="rounded-xl border border-border bg-bg/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xxs uppercase tracking-tight text-muted">
                  Before
                </div>
                <div className="mt-1 text-sm font-medium text-fg">
                  Low-connectivity resident with fragmented paperwork and invisible household upside.
                </div>
              </div>
              <Icons.ArrowRightIcon size={16} className="text-muted" />
              <div className="max-w-sm">
                <div className="text-xxs uppercase tracking-tight text-muted">
                  After
                </div>
                <div className="mt-1 text-sm font-medium text-fg">
                  AI splits the case, flags the risk, assembles the packet, and routes the physical handoff.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-danger/40 bg-danger/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xxs uppercase tracking-[0.18em] text-danger">
                Digital exclusion risk
              </div>
              <Badge tone={derTone}>{derLabel(der)}</Badge>
            </div>
            <div className="mt-3 flex items-end gap-3">
              <div className="text-4xl font-semibold tracking-tighter text-danger tabular">
                {formatPct(der)}
              </div>
              <div className="pb-1 text-sm text-danger/80">
                {derHint(der)}
              </div>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-danger/10">
              <div
                className="h-full rounded-full bg-danger transition-all"
                style={{ width: `${Math.max(8, Math.round((der ?? 0) * 100))}%` }}
              />
            </div>
            <div className="mt-4 grid gap-2 text-xs text-muted sm:grid-cols-2">
              <SignalPill
                label="Smartphone"
                active={Boolean(intake.smartphone_access)}
                positive="Available"
                negative="Missing"
              />
              <SignalPill
                label="Internet"
                active={Boolean(intake.internet_access)}
                positive="Available"
                negative="Missing"
              />
              <SignalPill
                label="Bank linkage"
                active={Boolean(intake.bank_linked)}
                positive="Linked"
                negative="Unlinked"
              />
              <SignalPill
                label="Print route"
                active={hasPrintRoute}
                positive="Activated"
                negative="Not needed"
              />
            </div>
          </div>

          {data.eligibility_pulse && (
            <div className="rounded-2xl border border-success/30 bg-success/5 p-4">
              <div className="flex items-center gap-2 text-xxs uppercase tracking-tight text-success">
                <Icons.SparklesIcon size={12} />
                DER warning did not freeze the case
              </div>
              <div className="mt-2 text-sm text-fg">
                The system is still watching for new openings.{" "}
                {data.eligibility_pulse.new_scheme_ids.length > 0 &&
                  `${data.eligibility_pulse.new_scheme_ids.length} new scheme signal${
                    data.eligibility_pulse.new_scheme_ids.length === 1 ? "" : "s"
                  } detected.`}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function JourneyStrip({ data }: { data: CaseDetail }) {
  const eligible = data.matches.filter((m) => m.eligibility !== "not_eligible");
  const topBlockers = data.blockers[0]?.blockers.length || 0;
  const packetReady = !!data.packet;
  const packetSent = !!data.packet?.sent;
  const hasPrintRoute = !!data.print_routing_slip;
  const swarmCount = data.profile?.household_swarm_plan?.swarms.length || data.profile?.household_opportunity_queue?.length || 0;

  const steps = [
    {
      label: "Problem",
      value: topBlockers > 0 ? `${topBlockers} blocker${topBlockers === 1 ? "" : "s"}` : "Intake ready",
      tone: topBlockers > 0 ? "danger" : "success",
    },
    {
      label: "AI split",
      value: swarmCount > 0 ? `${swarmCount + 1} benefit paths` : "Single path",
      tone: swarmCount > 0 ? "success" : "neutral",
    },
    {
      label: "Match",
      value: eligible[0]?.scheme_name || `${eligible.length} matched`,
      tone: eligible.length > 0 ? "success" : "warn",
    },
    {
      label: "Blocker",
      value: topBlockers > 0 ? "Needs intervention" : "Submission ready",
      tone: topBlockers > 0 ? "warn" : "success",
    },
    {
      label: "Packet",
      value: packetSent ? "Sent" : packetReady ? "Drafted" : "Pending",
      tone: packetSent ? "success" : packetReady ? "warn" : "neutral",
    },
    {
      label: "Print route",
      value: hasPrintRoute ? "Hub assigned" : "Digital route",
      tone: hasPrintRoute ? "warn" : "neutral",
    },
    {
      label: "Follow-up",
      value: data.followups.length > 0 ? `${data.followups.length} tasks` : "None yet",
      tone: data.followups.length > 0 ? "success" : "neutral",
    },
  ] as const;

  return (
    <div className="grid gap-3 md:grid-cols-7">
      {steps.map((step) => (
        <div key={step.label} className="rounded-xl border bg-bg px-4 py-3">
          <div className="text-xxs uppercase tracking-tight text-muted">{step.label}</div>
          <div className="mt-2 text-sm font-semibold tracking-tight">{step.value}</div>
          <div className="mt-2">
            <Badge tone={step.tone}>{step.label}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function ParallelSwarmSection({
  data,
  beneficiaryName,
}: {
  data: CaseDetail;
  beneficiaryName: string | null;
}) {
  const topMatches = data.matches.filter((m) => m.eligibility !== "not_eligible").slice(0, 2);
  const swarmPlan = data.profile?.household_swarm_plan;
  const fallbackQueue = data.profile?.household_opportunity_queue || [];
  const extraTracks =
    swarmPlan?.swarms.length
      ? swarmPlan.swarms.map((swarm) => ({
          key: swarm.member_id,
          name: swarm.name || swarm.member_id,
          relation: swarm.relation,
          recommendedSwarm: swarm.recommended_swarm,
          goals: swarm.goals,
          ceiling: swarm.estimated_benefit_ceiling_inr,
          opportunities: swarm.opportunities,
        }))
      : fallbackQueue.map((item) => ({
          key: item.member_id,
          name: item.name || item.member_id,
          relation: item.relation,
          recommendedSwarm: item.recommended_swarm,
          goals: item.goals,
          ceiling: 0,
          opportunities: [],
        }));

  if (topMatches.length === 0 && extraTracks.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xxs uppercase tracking-[0.2em] text-muted">
            Parallel swarms
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tighter">
            One case, multiple benefit paths
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            The orchestrator is not just matching the resident. It is splitting the household into separate support tracks that can run in parallel.
          </p>
        </div>
        <Badge tone="fg">{extraTracks.length + 1} live track{extraTracks.length === 0 ? "" : "s"}</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <TrackCard
          title={`Swarm A · ${beneficiaryName || "Primary resident"}`}
          subtitle="Primary resident"
          accent="success"
          ceiling={data.missed_value_inr ?? 0}
          summary="Immediate eligible paths for the resident."
          pills={topMatches.map((match) => match.scheme_name || match.scheme_id)}
          items={topMatches.map((match) => ({
            title: match.scheme_name || match.scheme_id,
            meta: match.scheme_category?.replaceAll("_", " "),
            value: match.estimated_annual_value_inr
              ? `${formatINR(match.estimated_annual_value_inr)}/yr`
              : match.eligibility,
          }))}
        />

        <div className="grid gap-4">
          {extraTracks.length > 0 ? (
            extraTracks.map((track, index) => (
              <TrackCard
                key={track.key}
                title={`Swarm ${String.fromCharCode(66 + index)} · ${track.name}`}
                subtitle={track.relation || "Household opportunity"}
                accent="warn"
                ceiling={track.ceiling}
                summary={humanize(track.recommendedSwarm)}
                pills={track.goals}
                items={
                  track.opportunities.length > 0
                    ? track.opportunities.slice(0, 2).map((opportunity) => ({
                        title: opportunity.name || opportunity.scheme_id,
                        meta: opportunity.category?.replaceAll("_", " "),
                        value: opportunity.estimated_annual_value_inr
                          ? `${formatINR(opportunity.estimated_annual_value_inr)}/yr`
                          : formatPct(opportunity.confidence),
                      }))
                    : [
                        {
                          title: "Opportunity queued",
                          meta: "Awaiting expansion into scored member matches",
                          value: "Ready for follow-up",
                        },
                      ]
                }
              />
            ))
          ) : (
            <Card className="border-dashed">
              <CardBody className="py-8 text-sm text-muted">
                No dependent path has been split out yet.
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}

function TrackCard({
  title,
  subtitle,
  accent,
  ceiling,
  summary,
  pills,
  items,
}: {
  title: string;
  subtitle: string;
  accent: "success" | "warn";
  ceiling: number;
  summary: string;
  pills: string[];
  items: Array<{ title: string; meta?: string | null; value: string }>;
}) {
  return (
    <div
      className={
        accent === "success"
          ? "rounded-2xl border border-success/30 bg-[linear-gradient(180deg,rgba(22,163,74,0.10),transparent)] p-4"
          : "rounded-2xl border border-warn/30 bg-[linear-gradient(180deg,rgba(217,119,6,0.10),transparent)] p-4"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xxs uppercase tracking-tight text-muted">{subtitle}</div>
          <div className="mt-1 text-lg font-semibold tracking-tight">{title}</div>
        </div>
        <div className="text-right">
          <div className="text-xxs uppercase tracking-tight text-muted">Benefit ceiling</div>
          <div className="mt-1 text-lg font-semibold tabular">
            {ceiling > 0 ? formatINR(ceiling) : "Queued"}
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted">{summary}</p>
      {pills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {pills.map((pill) => (
            <Badge key={pill}>{pill}</Badge>
          ))}
        </div>
      )}
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={`${item.title}-${item.value}`} className="rounded-xl border bg-bg/85 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-fg">{item.title}</div>
                {item.meta && <div className="mt-1 text-xs text-muted">{item.meta}</div>}
              </div>
              <div className="text-xs font-medium tabular text-fg">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border bg-bg/75 px-4 py-3">
      <div className="text-xxs uppercase tracking-tight text-muted">{label}</div>
      <div className="mt-2 text-xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted">{detail}</div>
    </div>
  );
}

function SignalPill({
  label,
  active,
  positive,
  negative,
}: {
  label: string;
  active: boolean;
  positive: string;
  negative: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-danger/20 bg-bg/70 px-3 py-2">
      <span>{label}</span>
      <span className={active ? "text-success" : "text-danger"}>
        {active ? positive : negative}
      </span>
    </div>
  );
}

function derLabel(score: number | null) {
  if (score == null) return "Unknown";
  if (score >= 0.6) return "High DER";
  if (score >= 0.3) return "Medium DER";
  return "Low DER";
}

function derHint(score: number | null) {
  if (score == null) return "No exclusion score available yet.";
  if (score >= 0.6) return "Digital self-service is unlikely to work without intervention.";
  if (score >= 0.3) return "Resident will probably need guided support to complete submission.";
  return "Resident can likely complete the digital path once paperwork is ready.";
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}
