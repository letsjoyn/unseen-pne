"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAllowed, ROLE_LANDING, useAuth } from "@/lib/auth";
import { Icons } from "@/components/ui";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "/";

  const isLogin = pathname === "/login";

  useEffect(() => {
    if (loading) return;
    if (!session && !isLogin) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (session && isLogin) {
      router.replace(ROLE_LANDING[session.role]);
      return;
    }
    if (session && !isAllowed(session.role, pathname)) {
      router.replace(ROLE_LANDING[session.role]);
    }
  }, [loading, session, isLogin, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">
        <Icons.Spinner className="mr-2" /> Initializing session…
      </div>
    );
  }

  // While the redirect happens we render the page anyway — Next.js will
  // unmount before paint in most cases. Shows the login page in unauth state.
  return <>{children}</>;
}
