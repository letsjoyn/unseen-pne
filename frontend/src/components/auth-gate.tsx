"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAllowed, isPublic, ROLE_LANDING, useAuth } from "@/lib/auth";
import { Icons } from "@/components/ui";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "/";

  const onLogin = pathname === "/login";
  const onPublic = isPublic(pathname);

  useEffect(() => {
    if (loading) return;

    // No session: only kick out of protected (non-public) routes.
    if (!session) {
      if (!onPublic) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
      return;
    }

    // Signed in and sitting on /login → bounce to role landing.
    if (onLogin) {
      router.replace(ROLE_LANDING[session.role]);
      return;
    }

    // Signed in but on a route the role can't access → bounce to landing.
    if (!isAllowed(session.role, pathname)) {
      router.replace(ROLE_LANDING[session.role]);
    }
  }, [loading, session, onLogin, onPublic, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">
        <Icons.Spinner className="mr-2" /> Initializing session…
      </div>
    );
  }

  return <>{children}</>;
}
