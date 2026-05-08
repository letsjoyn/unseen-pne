"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "@/components/ui/container";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/cn";

const links = [
  { href: "/cases", label: "Cases" },
  { href: "/intake", label: "New intake" },
  { href: "/insights", label: "Insights" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <Container>
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-sm border border-fg bg-fg text-bg text-xxs font-semibold">
              U
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold tracking-tight">Unseen</span>
              <span className="text-xxs uppercase tracking-tight text-muted">PNE</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                    active ? "bg-subtle text-fg" : "text-muted hover:text-fg hover:bg-subtle"
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </Container>
    </header>
  );
}
