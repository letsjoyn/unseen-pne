import { Badge } from "@/components/ui/badge";

const tones: Record<string, "neutral" | "success" | "warn" | "danger" | "fg"> = {
  intake_created: "neutral",
  profiled: "neutral",
  matched: "warn",
  blockers_identified: "warn",
  packet_ready: "warn",
  routed: "warn",
  in_progress: "warn",
  packet_dispatched: "success",
  no_match: "danger",
  manual_review: "danger",
  escalated: "danger",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={tones[status] || "neutral"}>{status.replaceAll("_", " ")}</Badge>;
}

export function EligibilityBadge({ value }: { value: string }) {
  const tone =
    value === "eligible" ? "success" : value === "probable" ? "warn" : "danger";
  return <Badge tone={tone}>{value}</Badge>;
}
