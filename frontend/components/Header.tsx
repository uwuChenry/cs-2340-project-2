"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useAnimate } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { messageOf } from "@/lib/api";
import { useAppState } from "@/state/AppState";
import { useAuth } from "@/state/AuthState";
import UserMenu from "./UserMenu";
import { spring } from "./motion";

type Tab = { href: string; label: string };

const searchTab: Tab = { href: "/search", label: "Search" };

const seekerTabs: Tab[] = [
  searchTab,
  { href: "/shortlist", label: "Shortlist" },
  { href: "/applications", label: "Applications" },
];

const recruiterTabs: Tab[] = [
  { href: "/recruiter/pipeline", label: "Pipeline" },
  { href: "/recruiter/candidates", label: "Candidates" },
  { href: "/recruiter/post", label: "Post a role" },
];

// Pages a visitor can be on without being signed in. After signing in from one of
// these they should land on their own home, not be sent back to the landing page.
const publicPaths = ["/", "/search", "/login", "/signup"];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { cart, showToast } = useAppState();
  const { user, ready, logout } = useAuth();

  // Signed-out visitors (and anyone while the session is still being checked) see
  // only search. The rest of the tabs belong to a signed-in role, and profile and
  // account links live in the avatar menu.
  const tabs = !ready || !user
    ? [searchTab]
    : user.role === "admin"
      ? [{ href: "/admin", label: "Admin" }]
      : user.role === "recruiter"
        ? recruiterTabs
        : user.role === "job_seeker"
          ? seekerTabs
          : [searchTab];

  async function signOut() {
    try {
      await logout();
      router.push("/");
    } catch (e) {
      showToast(messageOf(e));
    }
  }

  const loginHref = publicPaths.includes(pathname) ? "/login" : `/login?next=${encodeURIComponent(pathname)}`;

  return (
    <header className="sticky top-0 z-40 bg-ground/92 backdrop-blur-[10px] border-b border-line">
      <div className="max-w-[1320px] mx-auto px-7 py-3.5 flex flex-wrap items-center gap-x-7 gap-y-3">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 text-ink no-underline hover:text-ink hover:no-underline">
          <div className="w-[22px] h-[22px] rounded-md bg-ink grid place-items-center">
            <div className="w-2 h-2 rounded-sm bg-ground" />
          </div>
          <span className="text-[17px] font-semibold tracking-[-0.02em]">Roster</span>
        </Link>

        <nav className="flex flex-wrap gap-1 flex-1 min-w-0">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative px-[13px] py-[7px] rounded-lg text-sm font-medium whitespace-nowrap no-underline transition-colors duration-150 ${
                  active ? "text-ink" : "text-muted hover:bg-hover-fill"
                }`}
              >
                {/* One shared pill that slides to whichever tab is active. */}
                {active && <motion.span layoutId="nav-pill" transition={spring} className="absolute inset-0 z-0 rounded-lg bg-surface" />}
                <span className="relative z-10">
                  {tab.label === "Shortlist" ? (
                    <>
                      Shortlist (<CountBadge count={cart.length} />)
                    </>
                  ) : (
                    tab.label
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0 min-h-[34px]">
          {/* While the session is being checked, show a placeholder rather than nothing,
              so the corner never looks like it lost its Sign in / Sign up links. */}
          {!ready && <div aria-hidden className="h-[34px] w-[150px] rounded-lg bg-hover-fill animate-pulse" />}
          {ready && user && <UserMenu user={user} onSignOut={signOut} />}
          {ready && !user && (
            <>
              <Link
                href={loginHref}
                className="px-3 py-[7px] rounded-lg text-[13px] font-medium no-underline hover:no-underline text-ink hover:bg-hover-fill"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="px-3 py-[7px] rounded-lg text-[13px] font-medium no-underline hover:no-underline bg-ink text-ground hover:bg-ink-2"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// The shortlist count, which bounces when a role is added.
function CountBadge({ count }: { count: number }) {
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const previous = useRef(count);

  useEffect(() => {
    if (count > previous.current) {
      animate(scope.current, { scale: [1, 1.5, 1] }, { duration: 0.45, ease: "easeOut" });
    }
    previous.current = count;
  }, [count, animate, scope]);

  return (
    <span ref={scope} className="inline-block tabular-nums">
      {count}
    </span>
  );
}
