"use client";

import { cn } from "@/lib/cn";

export type TabItem = {
  id: string;
  label: React.ReactNode;
  badge?: React.ReactNode;
};

export function Tabs({
  items,
  active,
  onChange,
  className,
}: {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex flex-wrap items-center gap-1 border-b -mx-5 px-5",
        className
      )}
    >
      {items.map((it) => {
        const isActive = it.id === active;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(it.id)}
            className={cn(
              "relative -mb-px flex items-center gap-1.5 px-3 py-2 text-xs font-medium tracking-tight transition-colors",
              isActive
                ? "text-fg"
                : "text-muted hover:text-fg"
            )}
          >
            <span>{it.label}</span>
            {it.badge && <span className="text-xxs">{it.badge}</span>}
            {isActive && (
              <span className="absolute inset-x-2 -bottom-px h-px bg-fg" />
            )}
          </button>
        );
      })}
    </div>
  );
}
