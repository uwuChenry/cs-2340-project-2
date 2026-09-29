import type { CSSProperties } from "react";
import type { Cluster } from "@/lib/types";

const gridStyle = (size: number): CSSProperties => ({
  backgroundImage:
    "linear-gradient(#E4E2DA 1px, transparent 1px), linear-gradient(90deg, #E4E2DA 1px, transparent 1px)",
  backgroundSize: `${size}px ${size}px`,
});

function AddressPin({ address }: { address: string }) {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center gap-1">
      <span className="bg-ink text-ground text-[11.5px] px-2 py-1 rounded-md whitespace-nowrap">{address}</span>
      <span className="w-[10px] h-[10px] rounded-full bg-accent border-[3px] border-white" />
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
