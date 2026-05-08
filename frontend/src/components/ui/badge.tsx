import { cn } from "@/lib/cn";

type Tone = "neutral" | "success" | "warn" | "danger" | "fg";

const tones: Record<Tone, string> = {
  neutral: "border-border bg-subtle text-fg",
  success: "border-success/40 bg-success/10 text-success",
  warn:    "border-warn/40    bg-warn/10    text-warn",
  danger:  "border-danger/40  bg-danger/10  text-danger",
  fg:      "border-fg bg-fg text-bg",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-xxs font-medium uppercase tracking-tight",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
