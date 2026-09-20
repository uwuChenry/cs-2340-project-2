"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ApiRole } from "@/lib/apiTypes";
import { useAuth } from "@/state/AuthState";
import Card from "./ui/Card";

const roleNames: Record<ApiRole, string> = {
  job_seeker: "job seeker",
  recruiter: "recruiter",
  admin: "administrator",
};

/**
 * Gate for pages that need a signed-in user, optionally of a particular role.
 * Visitors with no session are sent to /login and returned here afterwards.
 */
export default function Guard({ role, children }: { role?: ApiRole; children: ReactNode }) {
  const { user, ready, error } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user && !error) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [ready, user, error, router, pathname]);

  if (!ready) return <p className="text-[14px] text-muted">Loading…</p>;

  if (error) {
    return (
      <Card>
        <div className="text-[15px] font-semibold mb-1">Can&rsquo;t reach the server</div>
        <p className="m-0 text-[13.5px] text-muted">{error}</p>
      </Card>
    );
  }

  if (!user) return <p className="text-[14px] text-muted">Redirecting to sign in…</p>;

  if (role && user.role !== role) {
    return (
      <Card>
        <div className="text-[15px] font-semibold mb-1">This page is for {roleNames[role]} accounts</div>
        <p className="m-0 text-[13.5px] text-muted">
          You&rsquo;re signed in as {user.name}
          {user.role ? ` (${roleNames[user.role]})` : ""}. Sign out and use a {roleNames[role]} account to continue, or{" "}
          <Link href={user.role === "recruiter" ? "/recruiter/pipeline" : "/search"}>go to your own workspace</Link>.
        </p>
      </Card>
    );
  }

  return <>{children}</>;
}
