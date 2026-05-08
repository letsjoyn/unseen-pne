export function formatINR(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatPct(value: number | null | undefined, fractionDigits = 0): string {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function relativeFromNow(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;
  const sign = diff >= 0 ? "in" : "ago";
  if (abs < hour) return `${sign === "in" ? "in " : ""}${Math.round(abs / min)}m${sign === "ago" ? " ago" : ""}`;
  if (abs < day) return `${sign === "in" ? "in " : ""}${Math.round(abs / hour)}h${sign === "ago" ? " ago" : ""}`;
  return `${sign === "in" ? "in " : ""}${Math.round(abs / day)}d${sign === "ago" ? " ago" : ""}`;
}
