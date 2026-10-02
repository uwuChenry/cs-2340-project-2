"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { http } from "@/lib/api";
import type { ApiJob } from "@/lib/apiTypes";
import { toJob } from "@/lib/adapters";
import { notePrompts } from "@/lib/constants";
import { distanceLabel, salaryLabel, setupLabel } from "@/lib/derive";
import { pop, springBouncy, springSoft } from "@/lib/motion";
import { useAsync } from "@/lib/useAsync";
import { useAppState } from "@/state/AppState";
import { useAuth } from "@/state/AuthState";
import { CompanyMark } from "./ui/Avatar";
import Button from "./ui/Button";
import Chip from "./ui/Chip";
import Notice from "./ui/Notice";
import Sheet, { SheetCloseButton } from "./ui/Sheet";
import { SingleLocationMap } from "./SchematicMap";
import ReportDialog from "./ReportDialog";

export default function JobSheet() {
  const { openJobId, closeJob } = useAppState();
  return (
    <Sheet open={openJobId !== null} onClose={closeJob} width={620}>
      {openJobId && <JobDetail jobId={openJobId} />}
    </Sheet>
  );
}

// Takes the id as a prop rather than reading it from state, so it keeps
// showing the same posting while the sheet slides out after closing.
function JobDetail({ jobId }: { jobId: string }) {
  const {
    closeJob,
    applied,
    applyJob,
    cart,
    toggleCart,
    noteOpen,
    note,
    setNote,
    appendNote,
    cancelNote,
    submitNote,
  } = useAppState();
  const { user } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);

  // The list view already has most of this, but the sheet needs the fields only
  // the detail endpoint returns (which required skills the seeker has).
  const detail = useAsync(() => http.get<ApiJob>(`/api/jobs/${jobId}/`), [jobId, user?.id ?? null]);

  const loaded = detail.data && String(detail.data.id) === jobId ? toJob(detail.data) : null;

  if (!loaded) {
    return (
      <div className="p-7 flex justify-between gap-4 items-start">
        <div className="min-w-0">
          {detail.error ? <Notice tone="error">{detail.error}</Notice> : <p className="m-0 text-[15px] font-bold text-muted">Fetching the posting…</p>}
        </div>
        <SheetCloseButton onClick={closeJob} />
      </div>
    );
  }

  const job = loaded;
  const isApplied = !!applied[job.id];
  const inCart = cart.includes(job.id);
  const matched = job.matchedSkills ?? [];

  const facts = [
    { label: "Level", value: job.level || "Not specified" },
    { label: "Team size", value: job.teamSize || "Not specified" },
    { label: "Visa sponsorship", value: job.visa ? "Available" : "Not offered" },
    { label: "Posted", value: job.posted },
  ];

  return (
    <>
      <div className="px-7 pt-[26px] pb-5 border-b-2 border-dashed border-line flex justify-between gap-4 items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-[9px] mb-2">
            <CompanyMark mark={job.mark} bg={job.logoBg} size={34} />
            <span className="text-[14.5px] font-extrabold text-muted">{job.company}</span>
          </div>
          <h2 className="m-0 mb-2 font-display text-[28px] font-semibold leading-[1.15] text-ink">{job.title}</h2>
          <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[14.5px] font-bold text-muted">
            <span>{job.location}</span>
            <span>{setupLabel(job)}</span>
            <span className="text-ink">{salaryLabel(job)}</span>
            <span>{distanceLabel(job)}</span>
          </div>
        </div>
        <SheetCloseButton onClick={closeJob} />
      </div>

      <div className="px-7 pt-5">
        <div className="flex flex-wrap gap-2.5 mb-5">
          <Button variant={isApplied ? "sent" : "primary"} size="lg" onClick={() => applyJob(job.id)}>
            {isApplied ? "Sent!" : "Apply"}
          </Button>
          <Button variant={inCart ? "selected" : "secondary"} size="lg" aria-pressed={inCart} onClick={() => toggleCart(job)}>
            {inCart ? "In pocket" : "Pocket it"}
          </Button>
        </div>

        <AnimatePresence initial={false}>
        {noteOpen && (
          <motion.div
            key="note"
            initial={{ opacity: 0, height: 0, scale: 0.97 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.97 }}
            transition={springSoft}
            className="origin-top overflow-hidden"
          >
          <div className="bg-white rounded-[22px] p-[18px] mb-5 shadow-[0_4px_0_var(--color-line)]">
            <div className="font-display text-[18px] font-semibold text-ink mb-[3px]">Write them a little note</div>
            <p className="m-0 mb-2.5 text-[13.5px] font-semibold text-muted">
              Optional, up to 400 characters. Recruiters see it above your profile.
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Why this role, in your own words…"
              aria-label="Note to the recruiter"
              className="ruled w-full px-3.5 py-3 border-2 border-line rounded-[14px] text-[14.5px] font-semibold leading-[27px] resize-y mb-2.5 focus:outline-3 focus:outline-sun"
            />
            <div className="flex flex-wrap gap-[7px] mb-3.5">
              {notePrompts.map((p) => (
                <Chip key={p.label} dashed onClick={() => appendNote(p.text)}>
                  + {p.label}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" size="md" className="!text-[14.5px]" onClick={cancelNote}>
                Send without note
              </Button>
              <Button variant="primary" size="md" className="!text-[14.5px]" onClick={submitNote}>
                Send application
              </Button>
            </div>
          </div>
          </motion.div>
        )}

        {isApplied && !noteOpen && (
          <motion.div
            key="sent"
            variants={pop}
            initial="hidden"
            animate="shown"
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="bg-success-bg rounded-[18px] px-4 py-[13px] mb-5 text-[14.5px] font-bold text-success shadow-[0_3px_0_var(--color-success-border)] origin-left"
          >
            Sent! It&rsquo;s in your Mailbox under <strong>Applied</strong>.
          </motion.div>
        )}
        </AnimatePresence>

        {user && reportOpen && (
          <ReportDialog
            target={{ kind: "job", id: job.id, label: "this posting" }}
            onClose={() => setReportOpen(false)}
            onSubmitted={() => {
              setReportOpen(false);
              closeJob();
            }}
          />
        )}
      </div>

      <div className="px-7 pb-9">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-[22px]">
          {facts.map((f) => (
            <div key={f.label} className="bg-white rounded-2xl px-3.5 py-[11px]">
              <div className="text-[12.5px] font-bold text-muted-2 mb-0.5">{f.label}</div>
              <div className="font-display text-[16px] font-semibold text-ink-2">{f.value}</div>
            </div>
          ))}
        </div>

        <h3 className="m-0 mb-2 font-display text-[18px] font-semibold text-ink">About the role</h3>
        <p className="m-0 mb-[22px] text-[15px] font-semibold leading-[1.6] text-ink-3 whitespace-pre-line">{job.about}</p>

        <h3 className="m-0 mb-1 font-display text-[18px] font-semibold text-ink">Skills they&rsquo;re after</h3>
        {user?.role === "job_seeker" && <p className="m-0 mb-2.5 text-[13px] font-bold text-muted-2">Green ones are on your profile</p>}
        <div className="flex flex-wrap gap-[7px] mt-2 mb-6">
          {job.skills.map((s, i) => {
            const hit = matched.includes(s);
            return (
              <motion.span
                key={s}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springBouncy, delay: 0.15 + i * 0.04 }}
                className={`font-display text-[14px] font-semibold rounded-full px-[13px] py-1 ${
                  hit ? "bg-success-bg text-accent-deep" : "bg-tan text-ink-3"
                }`}
              >
                {s}
              </motion.span>
            );
          })}
        </div>

        <h3 className="m-0 mb-2.5 font-display text-[18px] font-semibold text-ink">Where it is</h3>
        <SingleLocationMap address={job.address} height={180} />
        {user && (
          <Button variant="link" className="mt-5" onClick={() => setReportOpen(true)}>
            Report this posting
          </Button>
        )}
      </div>
    </>
  );
}
