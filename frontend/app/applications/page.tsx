"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { http } from "@/lib/api";
import type { ApiApplication } from "@/lib/apiTypes";
import { toApplication } from "@/lib/adapters";
import { STAGES } from "@/lib/types";
import { list, listItem } from "@/lib/motion";
import { useAsync } from "@/lib/useAsync";
import Guard from "@/components/Guard";
import Notice from "@/components/ui/Notice";
import PageHeading from "@/components/ui/PageHeading";
import { StageCount, StageProgress, StageStamp } from "@/components/ui/Stage";

export default function ApplicationsPage() {
  return (
    <Guard role="job_seeker">
      <Applications />
    </Guard>
  );
}

function Applications() {
  const { data, error, loading } = useAsync(() => http.get<ApiApplication[]>("/api/applications/"), []);

  const applications = (data ?? []).map(toApplication);
  const withNews = applications.filter((a) => a.hasNews).length;
  const stageCounts = STAGES.map((label, i) => ({
    label,
    count: applications.filter((a) => a.stageIndex === i).length,
  }));

  const summary = data
    ? `${applications.length} ${applications.length === 1 ? "letter" : "letters"} sent${withNews ? ` · ${withNews} with news` : ""}`
    : undefined;

  return (
    <div className="max-w-[900px]">
      <PageHeading tag="Mailbox" title="Your applications" sub={summary} className="mb-5" />

      {error && <Notice tone="error">{error}</Notice>}
      {loading && !data && <p className="text-[15px] font-bold text-area-ink-2">Checking the mailbox…</p>}

      {data && (
        <>
          <motion.div variants={list} initial="hidden" animate="shown" className="flex flex-wrap gap-2.5 mb-[22px]">
            {stageCounts.map((s, i) => (
              <motion.div
                key={s.label}
                variants={listItem}
                className="flex items-center gap-[9px] bg-paper rounded-full py-[7px] pl-[7px] pr-3.5 shadow-[0_4px_0_var(--color-edge)]"
              >
                <StageCount stageIndex={i} count={s.count} />
                <span className="font-display text-[14.5px] font-semibold text-ink-2">{s.label}</span>
              </motion.div>
            ))}
          </motion.div>

          {applications.length === 0 ? (
            <Notice>
              Nothing in the mailbox yet. Find something on <Link href="/search">the Board</Link> and apply in one click.
            </Notice>
          ) : (
            // Letters slide into the mailbox one after another; each stamp lands
            // just after its letter does.
            <motion.div variants={list} initial="hidden" animate="shown" className="flex flex-col gap-3.5">
              {applications.map((a, i) => (
                <motion.div
                  key={a.id}
                  variants={listItem}
                  className="bg-paper rounded-[22px] px-[18px] py-4 shadow-[0_5px_0_#D9C59A] flex flex-wrap gap-4 items-center"
                >
                  <StageStamp stageIndex={a.stageIndex} delay={0.15 + i * 0.05} />
                  <div className="flex-[1_1_260px] min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-display text-[19px] font-semibold text-ink">{a.company}</span>
                      {a.hasNews && (
                        <motion.span
                          initial={{ scale: 0, rotate: -20 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 14, delay: 0.4 + i * 0.05 }}
                          className="text-[11px] font-extrabold bg-danger text-white px-2 py-0.5 rounded-full"
                        >
                          NEW
                        </motion.span>
                      )}
                    </div>
                    <div className="text-[14px] font-bold text-muted mb-2.5">
                      {a.title} · {a.location}
                    </div>
                    <StageProgress stageIndex={a.stageIndex} delay={i * 0.05} />
                  </div>
                  <div className="flex-[0_1_auto] ml-auto text-right">
                    <div className="text-[13px] font-bold text-muted-2">{a.updated}</div>
                    <div className="font-display text-[15px] font-semibold text-ink mt-0.5">{a.next}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
