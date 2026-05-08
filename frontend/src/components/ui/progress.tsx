import { cn } from "@/lib/cn";

export function Progress({
  value,
  className,
  tone = "fg",
}: {
  value: number;
  className?: string;
  tone?: "fg" | "muted";
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn("h-1 w-full overflow-hidden rounded-sm bg-subtle", className)}
    >
      <div
        className={cn(
          "h-full transition-[width] duration-500 ease-out",
          tone === "fg" ? "bg-fg" : "bg-muted"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
