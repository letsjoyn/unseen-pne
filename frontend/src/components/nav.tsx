"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Icons } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/cn";

const links: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { href: "/cases", label: "Cases", icon: Icons.ListIcon },
  { href: "/intake", label: "New intake", icon: Icons.PlusIcon },
  { href: "/insights", label: "Insights", icon: Icons.ChartIcon },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <Container>
        <div className="flex h-14 items-center justify-between gap-3">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-sm border border-fg bg-fg text-bg text-xxs font-semibold">
              U
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold tracking-tight">
                Unseen
              </span>
              <span className="text-xxs uppercase tracking-tight text-muted">
                PNE
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const active =
                pathname === l.href || pathname.startsWith(l.href + "/");
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-subtle text-fg"
                      : "text-muted hover:text-fg hover:bg-subtle"
                  )}
                >
                  <Icon size={13} />
                  <span>{l.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-xxs text-muted md:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              vol_001 · Bengaluru
            </span>
            <ThemeToggle />
          </div>
        </div>
      </Container>
    </header>
  );
}
