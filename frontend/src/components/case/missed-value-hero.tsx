import type { CaseDetail } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/ui";
import { formatINR } from "@/lib/format";

function derLabel(score: number | null | undefined): {
  label: string;
  tone: "danger" | "warn" | "success" | "neutral";
  hint: string;
} {
  if (score == null) return { label: "DER —", tone: "neutral", hint: "Not yet scored" };
  if (score >= 0.6)
    return {
      label: "DER High",
      tone: "danger",
      hint: "Beneficiary likely cannot self-apply digitally — assistance required.",
    };
  if (score >= 0.3)
    return {
      label: "DER Medium",
      tone: "warn",
      hint: "Limited digital access — guided submission recommended.",
    };
  return {
    label: "DER Low",
    tone: "success",
    hint: "Beneficiary can largely self-serve once paperwork is sorted.",
  };
}

export function MissedValueHero({ data }: { data: CaseDetail }) {
  const eligible = data.matches.filter((m) => m.eligibility !== "not_eligible");
  const since = (data.case.created_at || "").slice(0, 4) || "intake";
  const der = derLabel(data.profile?.der_score);
  const missed = data.missed_value_inr ?? 0;

  return (
    <section className="relative overflow-hidden rounded border bg-bg">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
           style={{ backgroundImage: "radial-gradient(circle at 20% 0%, rgb(var(--fg)) 0%, transparent 60%)" }}
      />
      <div className="relative flex flex-col gap-6 px-6 py-7 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xxs uppercase tracking-tight text-muted">
            <Icons.AlertIcon size={12} className="text-fg" />
            <span>Estimated missed benefits</span>
            <span>·</span>
            <span>since intake {since}</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="font-semibold tracking-tighter tabular text-4xl md:text-5xl">
              {formatINR(missed)}
            </div>
            <div className="text-xxs uppercase text-muted">/ unlocked once approved</div>
          </div>
          <p className="mt-2 max-w-2xl text-xs text-muted">
            Sum of <span className="font-mono text-fg">estimated_annual_value_inr</span> across{" "}
            {eligible.length} eligible &amp; probable scheme{eligible.length === 1 ? "" : "s"}.
            Probable matches counted at 50% weight. Excludes any scheme already sent.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 md:items-end">
          <Badge tone={der.tone} className="px-2.5 py-1 text-xxs">
            {der.label}
            {data.profile?.der_score != null && (
              <span className="ml-1.5 font-mono opacity-80 tabular">
                {(data.profile.der_score * 100).toFixed(0)}
              </span>
            )}
          </Badge>
          <div className="max-w-[260px] text-right text-xxs text-muted md:text-right">
            {der.hint}
          </div>
        </div>
      </div>
    </section>
  );
}
