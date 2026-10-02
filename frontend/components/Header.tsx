"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { messageOf } from "@/lib/api";
import { useAppState } from "@/state/AppState";
import { useAuth } from "@/state/AuthState";
import PillTrack from "./ui/PillTrack";
import UserMenu from "./UserMenu";

type Tab = { href: string; label: string };

const boardTab: Tab = { href: "/search", label: "Board" };

const seekerTabs: Tab[] = [
  boardTab,
  { href: "/shortlist", label: "Pockets" },
  { href: "/applications", label: "Mailbox" },
  { href: "/profile", label: "My house" },
];

const recruiterTabs: Tab[] = [
  { href: "/recruiter/pipeline", label: "Garden" },
  { href: "/recruiter/candidates", label: "Scouting" },
  { href: "/recruiter/post", label: "Post a role" },
];

// Pages a visitor can be on without being signed in. After signing in from one of
// these they should land on their own home, not be sent back to the landing page.
const publicPaths = ["/", "/search", "/login", "/signup"];

const pill =
  "inline-flex items-center px-[15px] py-2 rounded-full font-display text-[15px] font-semibold whitespace-nowrap no-underline hover:no-underline active:translate-y-[3px] active:shadow-none";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { cart, showToast } = useAppState();
  const { user, ready, logout } = useAuth();

  // Signed-out visitors (and anyone while the session is still being checked) see
  // only the board. The rest of the tabs belong to a signed-in role, and account
  // links live in the avatar menu.
  const tabs = !ready || !user ? [boardTab] : user.role === "recruiter" ? recruiterTabs : user.role === "job_seeker" ? seekerTabs : [boardTab];

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
    <header className="sticky top-0 z-40 bg-paper/95 shadow-[0_4px_0_rgba(60,35,15,0.08)]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-7 py-3 flex flex-wrap items-center gap-x-[22px] gap-y-3">
        <Link href="/" className="flex items-center gap-[9px] shrink-0 no-underline hover:no-underline">
          <span className="w-[34px] h-[34px] rounded-full bg-accent grid place-items-center shadow-[0_3px_0_var(--color-accent-deep)]">
            <span className="w-[13px] h-[13px] rounded-[13px_0_13px_0] bg-paper" />
          </span>
          <span className="font-display text-[22px] font-semibold text-ink-2">Roster</span>
        </Link>

        <nav className="min-w-0 order-[99] basis-full md:order-none md:basis-auto md:flex-1">
          {/* The yellow pill glides to the tab you're on as you move around town. */}
          <PillTrack
            selected={pathname}
            className="flex flex-wrap gap-2 pb-1"
            pillClassName="bg-sun rounded-full shadow-[0_4px_0_var(--color-sun-edge)]"
          >
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`${pill} bg-paper shadow-[0_4px_0_#D9C59A] ${
                    active ? "text-sun-ink hover:text-sun-ink" : "text-ink-3 hover:text-ink"
                  }`}
                >
                  <span className="relative z-[2]">
                    {tab.label}
                    {tab.href === "/shortlist" && (
                      <>
                        {" · "}
                        {/* The count bounces whenever something goes in or out of your pockets. */}
                        <motion.span
                          key={cart.length}
                          className="inline-block"
                          initial={{ scale: 1.6, y: -3 }}
                          animate={{ scale: 1, y: 0 }}
                          transition={{ type: "spring", stiffness: 600, damping: 14 }}
                        >
                          {cart.length}
                        </motion.span>
                      </>
                    )}
                  </span>
                </Link>
              );
            })}
          </PillTrack>
        </nav>

        <div className="flex items-center gap-3 shrink-0 min-h-[38px] ml-auto">
          {/* While the session is being checked, show a placeholder rather than nothing,
              so the corner never looks like it lost its Sign in / Sign up links. */}
          {!ready && <div aria-hidden className="h-[38px] w-[160px] rounded-full bg-tan animate-pulse" />}
          {ready && user && <UserMenu user={user} onSignOut={signOut} />}
          {ready && !user && (
            <>
              <Link href={loginHref} className={`${pill} !text-[14px] !py-[7px] bg-tan text-ink-2 hover:text-ink shadow-[0_4px_0_#D9C59A]`}>
                Sign in
              </Link>
              <Link
                href="/signup"
                className={`${pill} !text-[14px] !py-[7px] bg-accent text-white hover:text-white shadow-[0_4px_0_var(--color-accent-deep)]`}
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
