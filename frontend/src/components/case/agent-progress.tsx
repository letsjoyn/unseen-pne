"use client";

import { useEffect, useMemo, useState } from "react";
import type { CaseEvent } from "@/lib/types";
import { Icons } from "@/components/ui";
import { cn } from "@/lib/cn";

type StepState = "pending" | "running" | "done";

const STEPS: Array<{
  id: string;
  label: string;
  desc: string;
  matches: (e: CaseEvent) => boolean;
}> = [
  {
    id: "profiler",
    label: "Profiler",
    desc: "Normalizing intake into a structured profile",
    matches: (e) => e.type === "profile_built",
  },
  {
    id: "hunter",
    label: "Hunter",
    desc: "Pulling candidate schemes from the registry",
    matches: (e) => e.type === "schemes_identified",
  },
  {
    id: "matcher",
    label: "Matcher",
    desc: "Evaluating eligibility via JSONLogic rules",
    matches: (e) => e.type === "matches_finalized" || e.type === "matching_completed",
  },
  {
    id: "validator",
    label: "Validator",
    desc: "Identifying blockers and minimum path",
    matches: (e) => e.type === "blockers_identified" || e.type === "validator_done",
  },
  {
    id: "closer",
    label: "Closer",
    desc: "Drafting cover letter, email and checklist",
    matches: (e) => e.type === "packet_drafted" || e.type === "closer_done",
  },
  {
    id: "router",
    label: "Router",
    desc: "Choosing best channel via policy weights",
    matches: (e) => e.type === "route_plan_set",
  },
  {
    id: "watchdog",
    label: "Watchdog",
    desc: "Scheduling follow-ups",
    matches: (e) => e.type === "followups_scheduled",
  },
];

export function AgentProgress({
  events,
  done,
  className,
}: {
  events: CaseEvent[];
  done: boolean;
  className?: string;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 600);
    return () => clearInterval(id);
  }, []);

  const states = useMemo<StepState[]>(() => {
    const arr: StepState[] = STEPS.map(() => "pending");
    let runningSet = false;
    for (let i = 0; i < STEPS.length; i++) {
      const has = events.some((e) => STEPS[i].matches(e));
      if (has) arr[i] = "done";
      else if (!runningSet) {
        arr[i] = "running";
        runningSet = true;
      }
    }
    if (done) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] !== "done") arr[i] = "done";
      }
    }
    return arr;
  }, [events, done]);

  const completed = states.filter((s) => s === "done").length;
  const pct = Math.round((completed / STEPS.length) * 100);

  // running label flicker (just for visual liveness)
  const dots = ".".repeat((tick % 4) + 0);

  return (
    <section
      className={cn(
        "overflow-hidden rounded border bg-bg",
        className
      )}
    >
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div className="flex items-center gap-2">
          <Icons.SparklesIcon size={14} />
          <div className="text-sm font-semibold tracking-tight">
            Pipeline running
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="font-mono text-xxs tabular text-muted">
            {completed}/{STEPS.length}
          </div>
          <div className="h-1 w-32 overflow-hidden rounded-sm bg-subtle">
            <div
              className="h-full bg-fg transition-[width] duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <ul className="dotline-y">
        {STEPS.map((s, i) => {
          const state = states[i];
          return (
            <li
              key={s.id}
              className="flex items-start gap-3 px-5 py-3"
            >
              <div className="mt-0.5 flex h-5 w-5 items-center justify-center">
                {state === "done" ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-fg bg-fg text-bg">
                    <Icons.CheckIcon size={12} />
                  </span>
                ) : state === "running" ? (
                  <span className="text-fg">
                    <Icons.Spinner size={14} />
                  </span>
                ) : (
                  <span className="h-2 w-2 rounded-full border border-border bg-subtle" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium tracking-tight",
                    state === "pending" && "text-muted"
                  )}
                >
                  <span>{s.label} agent</span>
                  {state === "running" && (
                    <span className="font-mono text-xxs text-muted tabular">
                      running{dots}
                    </span>
                  )}
                  {state === "done" && (
                    <span className="text-xxs text-muted">done</span>
                  )}
                </div>
                <div className="mt-0.5 text-xxs text-muted">{s.desc}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
