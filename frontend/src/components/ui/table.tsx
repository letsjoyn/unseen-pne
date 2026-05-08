import { cn } from "@/lib/cn";

export function Table({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded border bg-bg", className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-subtle text-xxs uppercase tracking-tight text-muted">
      {children}
    </thead>
  );
}

export function TR({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr className={cn("border-b last:border-b-0 border-border/70", className)}>
      {children}
    </tr>
  );
}

export function TH({
  children,
  className,
  align = "left",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 font-medium",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className
      )}
    >
      {children}
    </th>
  );
}

export function TD({
  children,
  className,
  align = "left",
  mono,
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  mono?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-middle",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        mono && "font-mono tabular text-xs",
        className
      )}
    >
      {children}
    </td>
  );
}
