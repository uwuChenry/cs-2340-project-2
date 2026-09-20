import type { CSSProperties, ReactNode } from "react";
import type { Cluster, Job } from "@/lib/types";
import { isNearby, ringSizePx } from "@/lib/derive";

const gridStyle = (size: number): CSSProperties => ({
  backgroundImage:
    "linear-gradient(#E4E2DA 1px, transparent 1px), linear-gradient(90deg, #E4E2DA 1px, transparent 1px)",
  backgroundSize: `${size}px ${size}px`,
});

function MapBase({
  height,
  gridSize,
  className = "",
  children,
}: {
  height: number;
  gridSize: number;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`relative bg-map-ground overflow-hidden ${className}`}
      style={{ height }}
    >
      <div className="absolute inset-0" style={gridStyle(gridSize)} />
      {children}
    </div>
  );
}

function AddressPin({ address }: { address: string }) {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center gap-1">
      <span className="bg-ink text-ground text-[11.5px] px-2 py-1 rounded-md whitespace-nowrap">{address}</span>
      <span className="w-[10px] h-[10px] rounded-full bg-accent border-[3px] border-white" />
    </div>
  );
}

// Search screen: full map panel with commute ring, user dot, and per-job pins.
export function JobsMapPanel({
  jobs,
  radius,
  onPinClick,
}: {
  jobs: Job[];
  radius: number;
  onPinClick: (jobId: string) => void;
}) {
  const ring = ringSizePx(radius);
  return (
    <div className="bg-surface border border-line rounded-xl overflow-hidden">
      <MapBase height={520} gridSize={46}>
        <div className="absolute left-0 right-0 h-[9px] bg-map-road" style={{ top: "38%" }} />
        <div className="absolute top-0 bottom-0 w-[9px] bg-map-road" style={{ left: "56%" }} />
        <div
          className="absolute h-[130px] bg-map-water"
          style={{ left: "-6%", right: "40%", bottom: "-8%", transform: "rotate(-7deg)" }}
        />

        <div
          className="absolute rounded-full aspect-square"
          style={{
            left: "44%",
            top: "52%",
            width: ring,
            transform: "translate(-50%, -50%)",
            background: "rgba(27,77,255,0.07)",
            border: "1px dashed rgba(27,77,255,0.45)",
          }}
        />
        <div
          className="absolute w-3 h-3 rounded-full bg-accent border-[3px] border-white"
          style={{ left: "44%", top: "52%", transform: "translate(-50%, -50%)", boxShadow: "0 0 0 1px rgba(27,77,255,0.35)" }}
        />

        {jobs.map((job) => {
          // Remote roles (and any posting without coordinates) have no place on the map.
          if (job.mapLeft === null || job.mapTop === null) return null;
          const near = isNearby(job, radius);
          return (
            <button
              key={job.id}
              onClick={() => onPinClick(job.id)}
              className="absolute rounded-full px-[9px] py-[5px] text-xs font-semibold font-mono cursor-pointer whitespace-nowrap"
              style={{
                left: `${job.mapLeft}%`,
                top: `${job.mapTop}%`,
                transform: "translate(-50%, -100%)",
                background: near ? "#FFFFFF" : "rgba(255,255,255,0.6)",
                color: near ? "#1A1917" : "#A3A096",
                border: `1px solid ${near ? "#C6CCEC" : "#E6E3DC"}`,
                boxShadow: "0 2px 6px rgba(26,25,23,0.12)",
              }}
            >
              {job.salaryLow === null ? "—" : `$${job.salaryLow}k`}
            </button>
          );
        })}

        <div className="absolute left-3.5 bottom-3.5 bg-white/94 border border-line rounded-[9px] px-3 py-[9px]">
          <div className="text-xs text-muted mb-0.5">Within {radius} mi of you</div>
          <div className="text-[15px] font-semibold">
            {jobs.filter((j) => isNearby(j, radius)).length} of {jobs.length} roles
          </div>
          {jobs.some((j) => j.mapLeft === null) && (
            <div className="text-[11.5px] text-muted-2 mt-0.5">
              {jobs.filter((j) => j.mapLeft === null).length} remote or unpinned, not shown
            </div>
          )}
        </div>
      </MapBase>
    </div>
  );
}

// Job detail sheet + post-a-role card: schematic map with a single address pin.
export function SingleLocationMap({ address, height = 170 }: { address: string; height?: number }) {
  return (
    <div className="relative rounded-[10px] overflow-hidden bg-map-ground border border-line" style={{ height }}>
      <div className="absolute inset-0" style={gridStyle(36)} />
      <div className="absolute left-0 right-0 h-[7px] bg-map-road" style={{ top: "52%" }} />
      <AddressPin address={address} />
    </div>
  );
}

// Recruiter candidate search: applicant location clusters.
export function ClusterMap({ clusters }: { clusters: Cluster[] }) {
  return (
    <div className="relative h-[210px] bg-map-ground border-t border-line overflow-hidden">
      <div className="absolute inset-0" style={gridStyle(38)} />
      {clusters.map((c, i) => (
        <div
          key={i}
          className="absolute rounded-full flex items-center justify-center font-mono text-xs font-medium text-accent-deep"
          style={{
            left: `${c.left}%`,
            top: `${c.top}%`,
            width: c.size,
            height: c.size,
            transform: "translate(-50%, -50%)",
            background: "rgba(27,77,255,0.16)",
            border: "1px solid rgba(27,77,255,0.45)",
          }}
        >
          {c.count}
        </div>
      ))}
    </div>
  );
}
