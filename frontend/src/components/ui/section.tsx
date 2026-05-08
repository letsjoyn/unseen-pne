import { cn } from "@/lib/cn";

export function PageHeader({
  eyebrow,
  title,
  description,
  right,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b pb-6 md:flex-row md:items-end md:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 text-xxs uppercase tracking-tight text-muted">
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tighter">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function KV({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xxs uppercase tracking-tight text-muted">{label}</div>
      <div className="mt-1 text-sm font-medium tabular">{value}</div>
    </div>
  );
}
