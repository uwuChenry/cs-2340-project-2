"use client";

import { candidates, openRoleTitle } from "@/lib/mockData";
import { STAGES } from "@/lib/types";
import { useAppState } from "@/state/AppState";
import { Avatar } from "@/components/ui/Avatar";

export default function PipelinePage() {
  const { openCandidate } = useAppState();

  const columns = STAGES.map((label) => ({
    label,
    cards: candidates.filter((c) => c.stage === label),
  }));

  return (
    <div>
      <div className="flex items-end justify-between gap-5 mb-5 flex-wrap">
        <div>
          <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-2 mb-2">{openRoleTitle}</div>
          <h1 className="m-0 text-[30px] font-semibold tracking-[-0.025em]">Applicant pipeline</h1>
        </div>
        <div className="text-[13px] text-muted">Click a card to open the full review</div>
      </div>

      <div className="grid gap-3 items-start" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        {columns.map((col) => (
          <div key={col.label} className="bg-surface-tint border border-line rounded-xl p-2.5">
            <div className="flex items-center justify-between px-1 pb-2.5">
              <span className="text-[13px] font-semibold">{col.label}</span>
              <span className="font-mono text-xs text-muted-2">{col.cards.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {col.cards.map((c) => {
                const initials = c.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("");
                return (
                  <button
                    key={c.id}
                    onClick={() => openCandidate(c.id)}
                    className="text-left w-full bg-surface border border-line rounded-[9px] px-3 py-[11px] cursor-pointer hover:border-line-hover"
                  >
                    <div className="flex items-center gap-2 mb-[7px]">
                      <Avatar initials={initials} size={22} fontSize={10} />
                      <span className="text-[13.5px] font-semibold tracking-[-0.01em]">{c.name}</span>
                    </div>
                    <div className="text-xs text-muted mb-2">{c.role}</div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-accent bg-accent-tint rounded px-1.5 py-[3px]">
                        {c.matchPct}% match
                      </span>
                      <span className="text-[11.5px] text-muted-3">3d</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
