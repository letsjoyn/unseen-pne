import { cn } from "@/lib/cn";

export function Stat({
  label,
  value,
  hint,
  tone,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "success" | "warn" | "danger";
  className?: string;
}) {
  const valueTone =
    tone === "success"
      ? "text-success"
      : tone === "warn"
      ? "text-warn"
      : tone === "danger"
      ? "text-danger"
      : "text-fg";
  return (
    <div className={cn("rounded border bg-bg px-5 py-4", className)}>
      <div className="text-xxs uppercase tracking-tight text-muted">{label}</div>
      <div className={cn("mt-2 text-2xl font-semibold tabular tracking-tight", valueTone)}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xxs text-muted">{hint}</div>}
    </div>
  );
}
