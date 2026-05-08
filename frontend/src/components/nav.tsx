"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Container } from "@/components/ui/container";
import { Icons } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { ROLE_LABELS, useAuth, type Role } from "@/lib/auth";
import { cn } from "@/lib/cn";

type NavLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const ROLE_NAVS: Record<Role, NavLink[]> = {
  volunteer: [
    { href: "/cases", label: "Cases", icon: Icons.ListIcon },
    { href: "/intake", label: "New intake", icon: Icons.PlusIcon },
    { href: "/insights", label: "Insights", icon: Icons.ChartIcon },
  ],
  ngo_admin: [
    { href: "/admin/cases", label: "All cases", icon: Icons.ListIcon },
    { href: "/intake", label: "New intake", icon: Icons.PlusIcon },
    { href: "/admin/insights", label: "Insights", icon: Icons.ChartIcon },
    { href: "/admin/schemes", label: "Schemes", icon: Icons.FileTextIcon },
  ],
  beneficiary: [{ href: "/me", label: "My case", icon: Icons.HomeIcon }],
  reviewer: [
    { href: "/admin/schemes", label: "Schemes", icon: Icons.FileTextIcon },
    { href: "/insights", label: "Insights", icon: Icons.ChartIcon },
  ],
};

export function Nav() {
  const pathname = usePathname() || "/";
  const { session, signOut } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const links = session ? ROLE_NAVS[session.role] : [];
  const onLogin = pathname === "/login";

  return (
    <header className="sticky top-0 z-30 border-b bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <Container>
        <div className="flex h-14 items-center justify-between gap-3">
          <Link href={session ? "/" : "/login"} className="group flex items-center gap-2.5">
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

          {session && !onLogin && (
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
          )}

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {session ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="inline-flex items-center gap-2 rounded border border-border bg-bg px-2.5 py-1 text-xs hover:bg-subtle"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fg text-bg text-xxs font-semibold">
                    {(session.name || "?").trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden md:inline-flex flex-col items-start leading-tight">
                    <span className="font-medium">{session.name}</span>
                    <span className="text-xxs text-muted">
                      {ROLE_LABELS[session.role]}
                    </span>
                  </span>
                  <Icons.ChevronDownIcon size={11} className="text-muted" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full z-40 mt-1 w-60 overflow-hidden rounded border bg-bg shadow-lg">
                    <div className="border-b px-3 py-2.5">
                      <div className="text-sm font-semibold tracking-tight">
                        {session.name}
                      </div>
                      <div className="font-mono text-xxs text-muted">
                        {session.user_id}
                      </div>
                      <div className="mt-1 text-xxs text-muted">
                        {ROLE_LABELS[session.role]} · {session.org}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        signOut();
                        router.replace("/login");
                      }}
                      className="block w-full px-3 py-2 text-left text-xs hover:bg-subtle"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              !onLogin && (
                <Link
                  href="/login"
                  className="rounded border border-fg bg-fg px-2.5 py-1 text-xxs uppercase tracking-tight text-bg hover:opacity-90"
                >
                  Sign in
                </Link>
              )
            )}
          </div>
        </div>
      </Container>
    </header>
  );
}
