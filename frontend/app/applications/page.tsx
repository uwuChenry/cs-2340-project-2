"use client";

import { buildApplications } from "@/lib/derive";
import { jobs } from "@/lib/mockData";
import { STAGES } from "@/lib/types";
import { useAppState } from "@/state/AppState";
import Card from "@/components/ui/Card";
import ProgressRail from "@/components/ui/ProgressRail";

const statusColorClass: Record<string, string> = {
  ink: "text-ink",
  success: "text-success",
  muted: "text-muted-2",
};

export default function ApplicationsPage() {
  const { applied } = useAppState();
  const applications = buildApplications(applied, jobs);
  const stageCounts = STAGES.map((label, i) => ({
    label,
    count: applications.filter((a) => a.stageIndex === i).length,
  }));

  return (
    <div>
      <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-2 mb-2">Tracker</div>
      <h1 className="m-0 mb-[22px] text-[30px] font-semibold tracking-[-0.025em]">Your applications</h1>

      <div className="grid gap-2.5 mb-[22px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
        {stageCounts.map((s) => (
          <Card key={s.label} padding="none" className="px-[14px] py-[13px]">
            <div className="text-2xl font-semibold tracking-[-0.02em]">{s.count}</div>
            <div className="text-[12.5px] text-muted mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        {applications.map((a) => (
          <div
            key={a.id}
            className="px-[18px] py-4 border-b border-line-soft last:border-b-0 flex flex-wrap gap-x-5 gap-y-3.5 items-center"
          >
            <div className="flex-[1_1_200px] min-w-0">
              <div className="text-[15px] font-semibold tracking-[-0.01em]">{a.title}</div>
              <div className="text-[13px] text-muted mt-[3px]">
                {a.company} · {a.location}
              </div>
            </div>
            <ProgressRail stageIndex={a.stageIndex} />
            <div className="flex-[0_1_auto] ml-auto text-right">
              <div className="text-[12.5px] text-muted-2">{a.updated}</div>
              <div className={`text-[13px] font-medium mt-[3px] ${statusColorClass[a.statusColor]}`}>{a.next}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
