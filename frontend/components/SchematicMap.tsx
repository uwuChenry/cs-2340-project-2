"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import type { Cluster, Job } from "@/lib/types";
import { isNearby, ringSizePx } from "@/lib/derive";
import { springBouncy, springSoft } from "@/lib/motion";

// PLACEHOLDER map, drawn as a cosy island: water, a sandy beach and dotted land,
// with pins absolutely positioned from real coordinates (see projectToMap). The
// pin, ring and bubble styles are the ones to keep when a real map library lands.

const ISLAND_SHAPE = "46% 54% 42% 58% / 52% 44% 56% 48%";
const SMALL_ISLAND_SHAPE = "48% 52% 44% 56% / 55% 42% 58% 45%";

function Island({
  height,
  inset,
  shape = ISLAND_SHAPE,
  features = false,
  className = "",
  children,
}: {
  height: number;
  // Beach inset from the frame (%, top/right/bottom/left); the land sits ~4% inside it.
  inset: [number, number, number, number];
  shape?: string;
  // The river and pond on the big search map.
  features?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const [t, r, b, l] = inset;
  return (
    <div className={`island-water relative overflow-hidden rounded-[18px] ${className}`} style={{ height }}>
      <div className="absolute bg-map-beach" style={{ top: `${t}%`, right: `${r}%`, bottom: `${b}%`, left: `${l}%`, borderRadius: shape }} />
      <div
        className="island-land absolute"
        style={{ top: `${t + 4}%`, right: `${r + 3.5}%`, bottom: `${b + 4}%`, left: `${l + 3.5}%`, borderRadius: shape }}
      />
      {features && (
        <>
          <div className="absolute w-4 bg-map-water rounded-[10px]" style={{ left: "57%", top: "12%", bottom: "14%", rotate: "9deg" }} />
          <div className="absolute bg-map-water rounded-full" style={{ left: "30%", top: "66%", width: "12%", height: "9%" }} />
        </>
      )}
      {children}
    </div>
  );
}

function AddressPin({ address }: { address: string }) {
  return (
    <motion.div
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ...springBouncy, delay: 0.2 }}
      className="absolute left-1/2 top-[54%] -translate-x-1/2 -translate-y-full flex flex-col items-center gap-1"
    >
      <span className="font-display bg-paper text-ink text-[13px] font-semibold px-[11px] py-1 rounded-full shadow-[0_3px_0_#D9C59A] whitespace-nowrap">
        {address}
      </span>
      <span className="w-[18px] h-[18px] rounded-full bg-danger border-[3px] border-white shadow-[0_2px_0_rgba(40,20,5,0.3)]" />
    </motion.div>
  );
}

// Search screen: full map panel with the walking-distance ring, your avatar, and per-job pins.
export function JobsMapPanel({
  jobs,
  radius,
  initials,
  onPinClick,
}: {
  jobs: Job[];
  radius: number;
  initials: string;
  onPinClick: (jobId: string) => void;
}) {
  const ring = ringSizePx(radius);
  const unpinned = jobs.filter((j) => j.mapLeft === null).length;
  return (
    <div className="bg-paper rounded-[26px] p-2.5 shadow-[0_5px_0_var(--color-edge)]">
      <Island height={500} inset={[6, 5, 8, 5]} features className="rounded-[20px]">
        {/* The ring grows and shrinks with the walking-distance slider. */}
        <motion.div
          className="absolute rounded-full aspect-square border-[3px] border-dashed border-[#C9A22C] bg-[rgba(249,214,92,0.22)] -translate-x-1/2 -translate-y-1/2"
          style={{ left: "44%", top: "52%" }}
          initial={{ width: 0 }}
          animate={{ width: ring }}
          transition={springSoft}
        />
        {/* A soft ping around "you", like a here-you-are marker. Plain CSS so the
            server and client render the same thing; hidden for reduced motion,
            where it would only blink. */}
        <span
          aria-hidden
          className="absolute -translate-x-1/2 -translate-y-1/2 motion-reduce:hidden"
          style={{ left: "44%", top: "52%" }}
        >
          <span className="block w-[26px] h-[26px] rounded-full bg-[rgba(249,214,92,0.7)] animate-ping" />
        </span>
        <span
          className="absolute w-[26px] h-[26px] rounded-full bg-peach border-[3px] border-white shadow-[0_3px_0_rgba(40,20,5,0.3)] grid place-items-center font-display text-[10px] font-semibold text-peach-ink -translate-x-1/2 -translate-y-1/2"
          style={{ left: "44%", top: "52%" }}
          title="You"
        >
          {initials}
        </span>

        {jobs.map((job, i) => {
          // Remote roles (and any posting without coordinates) have no place on the map.
          if (job.mapLeft === null || job.mapTop === null) return null;
          const near = isNearby(job, radius);
          return (
            // Pins drop onto the island one after another. The hover lift is the
            // CSS `translate`, which stacks with Motion's transform.
            <motion.button
              key={job.id}
              initial={{ y: -28, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ ...springBouncy, delay: 0.15 + Math.min(i, 12) * 0.05 }}
              onClick={() => onPinClick(job.id)}
              title={`${job.title} · ${job.company}`}
              className={`absolute border-[3px] border-white rounded-full px-2.5 py-[3px] font-display text-[13px] font-semibold cursor-pointer whitespace-nowrap shadow-[0_3px_0_rgba(40,20,5,0.28)] -translate-x-1/2 -translate-y-full hover:-translate-y-[115%] transition-transform ${
                near ? "bg-accent text-white" : "bg-tan text-ink-3"
              }`}
              style={{ left: `${job.mapLeft}%`, top: `${job.mapTop}%` }}
            >
              {job.salaryLow === null ? "—" : `$${job.salaryLow}k`}
            </motion.button>
          );
        })}

        <div className="absolute left-3 bottom-3 bg-paper rounded-2xl px-3.5 py-[9px] shadow-[0_4px_0_#D9C59A]">
          <div className="text-[12.5px] font-bold text-muted">Within {radius} mi of home</div>
          <div className="font-display text-[17px] font-semibold text-ink">
            {jobs.filter((j) => isNearby(j, radius)).length} of {jobs.length} postings
          </div>
          {unpinned > 0 && <div className="text-[11.5px] font-bold text-muted-2 mt-0.5">{unpinned} remote or unpinned, not shown</div>}
        </div>
      </Island>
    </div>
  );
}

// Job detail sheet + post-a-role card: the island with a single red address pin.
export function SingleLocationMap({ address, height = 180 }: { address: string; height?: number }) {
  return (
    <Island height={height} inset={[9, 6, 10, 6]} shape={SMALL_ISLAND_SHAPE}>
      <AddressPin address={address} />
    </Island>
  );
}

// Recruiter candidate search: where applicants live, as paper bubbles with a rust ring.
export function ClusterMap({ clusters }: { clusters: Cluster[] }) {
  return (
    <Island height={220} inset={[7, 6, 9, 6]}>
      {clusters.map((c, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...springBouncy, delay: 0.1 + i * 0.07 }}
          className="absolute rounded-full grid place-items-center -translate-x-1/2 -translate-y-1/2 bg-paper border-[3px] border-rust shadow-[0_3px_0_rgba(40,20,5,0.25)] font-display text-[14px] font-semibold text-ink"
          style={{ left: `${c.left}%`, top: `${c.top}%`, width: c.size, height: c.size }}
        >
          {c.count}
        </motion.div>
      ))}
    </Island>
  );
}
