"use client";

import Link from "next/link";
import { LayoutGroup, motion } from "motion/react";
import { http } from "@/lib/api";
import type { ApiPipeline } from "@/lib/apiTypes";
import { timeAgo, toPipelineCard } from "@/lib/adapters";
import { STAGES } from "@/lib/types";
import { springSoft } from "@/lib/motion";
import { useAsync } from "@/lib/useAsync";
import { useRecruiterJobs } from "@/lib/useRecruiterJobs";
import { useAppState } from "@/state/AppState";
import Guard from "@/components/Guard";
import RoleSelect from "@/components/RoleSelect";
import { Avatar } from "@/components/ui/Avatar";
import Notice from "@/components/ui/Notice";
import PageHeading from "@/components/ui/PageHeading";
import { StageCount } from "@/components/ui/Stage";
import Wood from "@/components/ui/Wood";

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
      <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
        <PageHeading tag={selected ? `Hiring garden · ${selected.title}` : "Hiring garden"} title="Applicant pipeline" />
        <div className="flex items-center gap-3 flex-wrap">
          <RoleSelect jobs={list} selectedId={selected?.id ?? null} onChange={select} />
          {selected && (
            <span className="text-[14px] font-bold text-ink bg-paper px-3.5 py-[7px] rounded-full shadow-[0_3px_0_var(--color-edge)]">
              Tap someone to see their full application
            </span>
          )}
        </div>
      </div>

      {(jobsError || pipeline.error) && <Notice tone="error">{jobsError ?? pipeline.error}</Notice>}
      {jobsLoading && list.length === 0 && <p className="text-[15px] font-bold text-area-ink-2">Walking out to the garden…</p>}

      {!jobsLoading && !jobsError && selected === null && (
        <Notice>
          Nothing planted yet. <Link href="/recruiter/post">Pin your first posting to the board</Link> and applicants will
          sprout up here.
        </Notice>
      )}

      {selected && (
        // One layout group across all five planters: when someone moves to the
        // next stage their card travels across into the new planter.
        <LayoutGroup>
          <div className="grid gap-3.5 items-start" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {columns.map((col, i) => (
              <Wood key={col.label} className="min-h-[180px]">
                <div className="flex items-center justify-between gap-2 bg-paper rounded-full py-[5px] pl-3.5 pr-1.5 mb-3">
                  <span className="font-display text-[15px] font-semibold text-ink-2">{col.label}</span>
                  <StageCount stageIndex={i} count={col.cards.length} size={26} />
                </div>
                <div className="flex flex-col gap-2.5">
                  {col.cards.map((c, j) => (
                    <motion.button
                      key={c.id}
                      layoutId={`application-${c.id}`}
                      initial={{ opacity: 0, y: 16 }}
                      // The entrance is staggered; moving between planters is not.
                      animate={{ opacity: 1, y: 0, transition: { ...springSoft, delay: i * 0.06 + j * 0.04 } }}
                      transition={springSoft}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => openCandidate({ kind: "application", id: c.id })}
                      className="text-left w-full bg-paper border-0 rounded-2xl p-3 cursor-pointer shadow-[0_4px_0_rgba(40,20,5,0.25)]"
                    >
                      <div className="flex items-center gap-[9px] mb-1.5">
                        <Avatar initials={c.initials} size={32} fontSize={12} />
                        <span className="font-display text-[16px] font-semibold text-ink-2">{c.name}</span>
                      </div>
                      <div className="text-[13px] font-bold text-muted mb-2">{c.role}</div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-[12px] font-semibold text-white bg-accent px-[9px] py-0.5 rounded-full whitespace-nowrap">
                          {c.matchPct}% match
                        </span>
                        <span className="text-[12px] font-bold text-muted-2">{timeAgo(c.appliedAt)}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </Wood>
            ))}
          </div>
        </LayoutGroup>
      )}
    </div>
  );
}
