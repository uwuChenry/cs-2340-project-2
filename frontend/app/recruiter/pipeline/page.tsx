"use client";

import Link from "next/link";
import { http } from "@/lib/api";
import type { ApiPipeline } from "@/lib/apiTypes";
import { timeAgo, toPipelineCard } from "@/lib/adapters";
import { STAGES } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { useRecruiterJobs } from "@/lib/useRecruiterJobs";
import { useAppState } from "@/state/AppState";
import Guard from "@/components/Guard";
import RoleSelect from "@/components/RoleSelect";
import { Avatar } from "@/components/ui/Avatar";
import Notice from "@/components/ui/Notice";

export default function PipelinePage() {
  return (
    <Guard role="recruiter">
      <Pipeline />
    </Guard>
  );
}

function Pipeline() {
  const { openCandidate, dataVersion } = useAppState();
  const { list, selected, select, loading: jobsLoading, error: jobsError } = useRecruiterJobs();

  const pipeline = useAsync(
    () => http.get<ApiPipeline>(`/api/recruiter/jobs/${selected?.id}/pipeline/`),
    [selected?.id ?? null, dataVersion],
    selected !== null,
  );

  // Columns come back in stage order; the labels are the design's, not the
  // API's display names ("Under Review" vs "Review").
  const columns = (pipeline.data?.columns ?? []).map((col, i) => ({
    label: STAGES[i] ?? col.label,
    cards: col.candidates.map(toPipelineCard),
  }));

  return (
    <div>
      <div className="flex items-end justify-between gap-5 mb-5 flex-wrap">
        <div>
          <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-2 mb-2">
            {selected?.title ?? "Openings"}
          </div>
          <h1 className="m-0 text-[30px] font-semibold tracking-[-0.025em]">Applicant pipeline</h1>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <RoleSelect jobs={list} selectedId={selected?.id ?? null} onChange={select} />
          <div className="text-[13px] text-muted">Click a card to open the full review</div>
        </div>
      </div>

      {(jobsError || pipeline.error) && <Notice tone="error">{jobsError ?? pipeline.error}</Notice>}
      {jobsLoading && list.length === 0 && <p className="text-[14px] text-muted">Loading your openings…</p>}

      {!jobsLoading && !jobsError && selected === null && (
        <Notice>
          You haven&rsquo;t posted a role yet. <Link href="/recruiter/post">Post your first opening</Link> and applicants
          will appear here.
        </Notice>
      )}

      {selected && (
        <div className="grid gap-3 items-start" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
          {columns.map((col) => (
            <div key={col.label} className="bg-surface-tint border border-line rounded-xl p-2.5">
              <div className="flex items-center justify-between px-1 pb-2.5">
                <span className="text-[13px] font-semibold">{col.label}</span>
                <span className="font-mono text-xs text-muted-2">{col.cards.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {col.cards.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => openCandidate({ kind: "application", id: c.id })}
                    className="text-left w-full bg-surface border border-line rounded-[9px] px-3 py-[11px] cursor-pointer hover:border-line-hover"
                  >
                    <div className="flex items-center gap-2 mb-[7px]">
                      <Avatar initials={c.initials} size={22} fontSize={10} />
                      <span className="text-[13.5px] font-semibold tracking-[-0.01em]">{c.name}</span>
                    </div>
                    <div className="text-xs text-muted mb-2">{c.role}</div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-accent bg-accent-tint rounded px-1.5 py-[3px]">
                        {c.matchPct}% match
                      </span>
                      <span className="text-[11.5px] text-muted-3">{timeAgo(c.appliedAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
