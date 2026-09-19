"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SEEKER_INITIALS } from "@/lib/mockData";
import { useAppState } from "@/state/AppState";

const seekerTabs = [
  { href: "/search", label: "Search" },
  { href: "/shortlist", label: "Shortlist" },
  { href: "/applications", label: "Applications" },
  { href: "/profile", label: "Profile" },
];

const recruiterTabs = [
  { href: "/recruiter/pipeline", label: "Pipeline" },
  { href: "/recruiter/candidates", label: "Candidates" },
  { href: "/recruiter/post", label: "Post a role" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { cart } = useAppState();
  const role = pathname.startsWith("/recruiter") ? "recruiter" : "seeker";
  const tabs = role === "seeker" ? seekerTabs : recruiterTabs;

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
            const label = tab.label === "Shortlist" ? `Shortlist (${cart.length})` : tab.label;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-[13px] py-[7px] rounded-lg text-sm font-medium whitespace-nowrap no-underline ${
                  active ? "bg-surface text-ink" : "text-muted hover:bg-hover-fill"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex p-[3px] bg-hover-fill rounded-[9px]">
            <button
              onClick={() => router.push("/search")}
              className={`px-[11px] py-[5px] rounded-[7px] text-[13px] font-medium cursor-pointer border-0 ${
                role === "seeker" ? "bg-surface text-ink" : "bg-transparent text-muted"
              }`}
            >
              Job seeker
            </button>
            <button
              onClick={() => router.push("/recruiter/pipeline")}
              className={`px-[11px] py-[5px] rounded-[7px] text-[13px] font-medium cursor-pointer border-0 ${
                role === "recruiter" ? "bg-surface text-ink" : "bg-transparent text-muted"
              }`}
            >
              Recruiter
            </button>
          </div>
          <div className="w-8 h-8 rounded-full bg-accent-tint-3 border border-accent-border-3 grid place-items-center text-xs font-semibold text-accent">
            {SEEKER_INITIALS}
          </div>
        </div>
      </div>
    </header>
  );
}
