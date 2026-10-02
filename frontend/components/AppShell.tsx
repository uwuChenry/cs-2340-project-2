"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MotionConfig, motion } from "motion/react";
import { easeOut } from "@/lib/motion";
import Header from "./Header";
import JobSheet from "./JobSheet";
import CandidateSheet from "./CandidateSheet";
import Toast from "./Toast";

type Area = "grass" | "sand" | "sky" | "wood";

// Each part of town has its own ground. Anything not listed is grass.
const areas: [prefix: string, area: Area][] = [
  ["/shortlist", "sand"],
  ["/recruiter/post", "sand"],
  ["/signup", "sand"],
  ["/login", "sand"],
  ["/applications", "sky"],
  ["/recruiter/candidates", "sky"],
  ["/profile", "wood"],
  ["/recruiter/profile", "wood"],
  ["/account", "wood"],
];

function areaFor(pathname: string): Area {
  return areas.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? "grass";
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    // "user" honours prefers-reduced-motion: transforms and layout animations are
    // skipped, opacity still fades.
    <MotionConfig reducedMotion="user">
      <div data-area={areaFor(pathname)} className="area flex-1 flex flex-col min-h-screen transition-[background-color] duration-500">
        <Header />
        {/* Keyed by route so each page settles in when you arrive. Motion leaves
            `transform: none` once it lands, so fixed-position children still
            position against the viewport. */}
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={easeOut}
          className="max-w-[1320px] w-full mx-auto px-4 sm:px-7 pt-7 pb-[110px]"
        >
          {children}
        </motion.main>
        <JobSheet />
        <CandidateSheet />
        <Toast />
      </div>
    </MotionConfig>
  );
}
