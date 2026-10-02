"use client";

import { type ReactNode, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { http, messageOf } from "@/lib/api";
import type { ApiCandidateDetail, ApiMessage, ApiSeekerDetail, ApiThread } from "@/lib/apiTypes";
import { applicationToDetail, seekerToDetail, timeAgo } from "@/lib/adapters";
import { springBouncy, springSoft } from "@/lib/motion";
import { STAGES, STAGE_STATUSES, type CandidateDetail, type CandidateRef } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { useAppState } from "@/state/AppState";
import { Avatar } from "./ui/Avatar";
import Button from "./ui/Button";
import { Label, TextArea, TextInput } from "./ui/Field";
import Notice from "./ui/Notice";
import Sheet, { SheetCloseButton } from "./ui/Sheet";
import ReportDialog from "./ReportDialog";

// "Move to next stage" walks a candidate forward one step at a time and stops at
// Offer. Closing an application is a separate, deliberate action.
const OFFER = 3;
const CLOSED = 4;

export default function CandidateSheet() {
  const { openCand, closeCandidate } = useAppState();
  return (
    <Sheet open={openCand !== null} onClose={closeCandidate} width={660}>
      {openCand && <CandidateReview key={`${openCand.kind}-${openCand.id}`} openCand={openCand} />}
    </Sheet>
  );
}

// Takes the candidate as a prop rather than reading it from state, so it keeps
// showing the same person while the sheet slides out after closing.
function CandidateReview({ openCand }: { openCand: CandidateRef }) {
  const { closeCandidate, msgOpen, setMsgOpen, showToast, bumpData } = useAppState();
  const [emailOpen, setEmailOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const detail = useAsync(
    () =>
      openCand.kind === "application"
        ? http.get<ApiCandidateDetail>(`/api/recruiter/applications/${openCand.id}/`).then(applicationToDetail)
        : http.get<ApiSeekerDetail>(`/api/recruiter/candidates/${openCand.id}/`).then(seekerToDetail),
    [openCand.kind, openCand.id],
  );

  const cand = detail.data && detail.data.kind === openCand.kind && detail.data.id === openCand.id ? detail.data : null;

  if (!cand) {
    return (
      <div className="p-7 flex justify-between gap-4 items-start">
        <div className="min-w-0">
          {detail.error ? (
            <Notice tone="error">{detail.error}</Notice>
          ) : (
            <p className="m-0 text-[15px] font-bold text-muted">Fetching their application…</p>
          )}
        </div>
        <SheetCloseButton onClick={closeCandidate} />
      </div>
    );
  }

  const isApplication = cand.kind === "application";
  const stageIndex = cand.stageIndex ?? 0;
  const firstName = cand.name.split(" ")[0];

  async function moveTo(nextIndex: number, message: string) {
    if (!cand) return;
    try {
      await http.patch(`/api/recruiter/applications/${cand.id}/stage/`, { status: STAGE_STATUSES[nextIndex] });
      showToast(message);
      detail.reload();
      bumpData();
    } catch (e) {
      showToast(messageOf(e));
    }
  }

  function advanceStage() {
    if (stageIndex >= OFFER) {
      showToast(`${firstName} is already at ${STAGES[stageIndex]}.`);
      return;
    }
    moveTo(stageIndex + 1, `${firstName} moved to ${STAGES[stageIndex + 1]}!`);
  }

  function closeApplication() {
    if (!window.confirm(`Close ${firstName}'s application? It moves to Closed in the garden.`)) return;
    moveTo(CLOSED, `${firstName}'s application is closed.`);
  }

  function emailCandidate() {
    if (cand?.email) setEmailOpen((open) => !open);
    else showToast(`${firstName} keeps their email private.`);
  }

  const facts = [
    ...(isApplication
      ? [
          { label: "Stage", value: STAGES[stageIndex] },
          { label: "Applied", value: cand.appliedAgo ?? "" },
        ]
      : [{ label: "Current employer", value: cand.currentEmployer ?? "Not shared" }]),
    { label: "Pay expectation", value: cand.salaryExpectation || "Not shared" },
    { label: "Can start in", value: cand.noticePeriod || "Not shared" },
  ];

  // For an application, every required skill is listed and the ones the
  // candidate has are highlighted. A sourced seeker has no single role behind
  // them, so their own skills are listed and any the target role wants are highlighted.
  const skillChips = isApplication ? [...cand.matchedSkills, ...cand.missingSkills] : cand.skills;

  return (
    <>
      <div className="px-7 pt-[26px] pb-5 border-b-2 border-dashed border-line flex justify-between gap-4 items-start">
        <div className="flex gap-3.5 min-w-0 items-center">
          <Avatar initials={cand.initials} size={64} raised />
          <div className="min-w-0">
            <h2 className="m-0 mb-[3px] font-display text-[26px] font-semibold text-ink">{cand.name}</h2>
            <div className="text-[14.5px] font-bold text-muted">{[cand.role, cand.location].filter(Boolean).join(" · ")}</div>
          </div>
        </div>
        <SheetCloseButton onClick={closeCandidate} />
      </div>

      <div className="px-7 pt-5 pb-9">
        <div className="flex flex-wrap items-center gap-2 mb-[30px]">
          <Button variant="primary" size="md" className="!text-[14.5px]" onClick={() => setMsgOpen(!msgOpen)}>
            {msgOpen ? "Hide chat" : "Message in Roster"}
          </Button>
          <Button variant="secondary" size="md" className="!text-[14.5px]" onClick={emailCandidate}>
            {emailOpen ? "Hide email" : "Email candidate"}
          </Button>
          {isApplication && stageIndex < CLOSED && (
            <Button variant="selected" size="md" className="!text-[14.5px]" onClick={advanceStage}>
              Move to next stage
            </Button>
          )}
        </div>

        {reportOpen && (
          <ReportDialog
            target={{ kind: "user", id: cand.seekerId, label: "this profile" }}
            onClose={() => setReportOpen(false)}
            onSubmitted={() => {
              setReportOpen(false);
              closeCandidate();
            }}
          />
        )}

        {cand.note && (
          <div className="relative bg-white rounded-[22px] px-5 pt-5 pb-4 mb-[22px] shadow-[0_4px_0_var(--color-line)]">
            <span className="absolute -top-3 left-[18px] font-display text-[13px] font-semibold bg-link text-white px-3 py-[3px] rounded-full">
              {firstName}&rsquo;s note
            </span>
            <p className="m-0 text-[15px] font-semibold leading-[1.6] text-ink-2">{cand.note}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-[22px]">
          {facts.map((f) => (
            <div key={f.label} className="bg-white rounded-2xl px-3.5 py-[11px]">
              <div className="text-[12.5px] font-bold text-muted-2 mb-0.5">{f.label}</div>
              <motion.div
                key={f.value}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springBouncy}
                className="font-display text-[16px] font-semibold text-ink-2"
              >
                {f.value}
              </motion.div>
            </div>
          ))}
        </div>

        {skillChips.length > 0 && (
          <>
            <h3 className="m-0 mb-1 font-display text-[18px] font-semibold text-ink">Skill match</h3>
            <p className="m-0 mb-2.5 text-[13px] font-bold text-muted-2">Green ones match your posting</p>
            <div className="flex flex-wrap gap-[7px] mb-6">
              {skillChips.map((s) => {
                const hit = cand.matchedSkills.includes(s);
                return (
                  <span
                    key={s}
                    className={`font-display text-[14px] font-semibold rounded-full px-[13px] py-1 ${
                      hit ? "bg-success-bg text-accent-deep" : "bg-tan text-ink-3"
                    }`}
                  >
                    {s}
                  </span>
                );
              })}
            </div>
          </>
        )}

        <h3 className="m-0 mb-3 font-display text-[18px] font-semibold text-ink">Work experience</h3>
        {cand.experience.length === 0 ? (
          <p className="m-0 mb-[26px] text-[14px] font-bold text-muted">No experience listed.</p>
        ) : (
          <div className="flex flex-col gap-3.5 mb-[26px]">
            {cand.experience.map((e) => (
              <div key={`${e.years}-${e.role}-${e.org}`} className="flex flex-wrap gap-x-3.5 gap-y-1.5 items-start">
                <span className="font-display text-[13px] font-semibold bg-tan text-ink-3 px-[11px] py-[3px] rounded-full whitespace-nowrap">
                  {e.years}
                </span>
                <div className="flex-[1_1_240px] min-w-0">
                  <div className="font-display text-[16.5px] font-semibold text-ink-2">{e.role}</div>
                  <div className="text-[13.5px] font-bold text-muted mt-px">{e.org}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence initial={false}>
          {emailOpen && cand.email && (
            <Reveal key="email">
              <EmailComposer cand={cand} firstName={firstName} onSent={() => setEmailOpen(false)} />
            </Reveal>
          )}
          {msgOpen && (
            <Reveal key="chat">
              <MessageThread cand={cand} firstName={firstName} />
            </Reveal>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-7">
          {isApplication && stageIndex < CLOSED && (
            <Button variant="link" onClick={closeApplication}>
              Close application
            </Button>
          )}
          <Button variant="link" onClick={() => setReportOpen(true)}>
            Report profile
          </Button>
        </div>
      </div>
    </>
  );
}

// Opens a section of the sheet by growing it into place.
function Reveal({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={springSoft}
      className="overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

// Sends a real email through the platform (story 15) -- distinct from the
// in-platform message thread below, which stays inside the app. Only rendered
// when the seeker has opted in to show_contact; the backend enforces the same
// check independently.
function EmailComposer({ cand, firstName, onSent }: { cand: CandidateDetail; firstName: string; onSent: () => void }) {
  const { showToast } = useAppState();
  const [subject, setSubject] = useState(`Reaching out from ${cand.role || "our team"}`);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();
    if (!trimmedSubject || !trimmedBody || sending) return;
    setSending(true);
    try {
      await http.post(`/api/recruiter/candidates/${cand.seekerId}/email/`, {
        subject: trimmedSubject,
        body: trimmedBody,
        job: cand.jobId ? Number(cand.jobId) : undefined,
      });
      showToast(`Email's off to ${firstName}!`);
      onSent();
    } catch (e) {
      showToast(messageOf(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-t-2 border-dashed border-line pt-5 mb-6">
      <h3 className="m-0 mb-3 font-display text-[18px] font-semibold text-ink">Email {firstName}</h3>
      <div className="flex flex-col gap-2.5">
        <div>
          <Label htmlFor="email-subject">Subject</Label>
          <TextInput id="email-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
        </div>
        <div>
          <Label htmlFor="email-body">Message</Label>
          <TextArea
            id="email-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder={`Write a message to ${firstName}…`}
          />
        </div>
        <div className="flex justify-end">
          <Button variant="primary" size="md" onClick={send} disabled={sending || !subject.trim() || !body.trim()}>
            {sending ? "Sending…" : "Send email"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Opening the thread is a POST to /api/threads/, which the server treats as
// "get or create" for this recruiter, seeker and role, so reopening the sheet
// shows the existing conversation instead of starting a new one.
function MessageThread({ cand, firstName }: { cand: CandidateDetail; firstName: string }) {
  const { showToast } = useAppState();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const thread = useAsync(
    () => http.post<ApiThread>("/api/threads/", { seeker: Number(cand.seekerId), job: cand.jobId ? Number(cand.jobId) : undefined }),
    [cand.seekerId, cand.jobId],
  );

  async function send() {
    const body = draft.trim();
    if (!body || !thread.data || sending) return;
    setSending(true);
    try {
      const message = await http.post<ApiMessage>(`/api/threads/${thread.data.id}/messages/`, { body });
      thread.setData((t) => ({ ...t, messages: [...t.messages, message] }));
      setDraft("");
    } catch (e) {
      showToast(messageOf(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-t-2 border-dashed border-line pt-5">
      <h3 className="m-0 mb-3 font-display text-[18px] font-semibold text-ink">Chat with {firstName}</h3>

      {thread.error && <Notice tone="error">{thread.error}</Notice>}
      {!thread.data && !thread.error && <p className="m-0 mb-3 text-[14px] font-bold text-muted">Opening the chat…</p>}

      {thread.data && (
        <div className="flex flex-col gap-2.5 mb-3.5">
          {thread.data.messages.length === 0 && (
            <p className="m-0 self-center text-[13px] font-bold text-muted-2">No messages yet. Say hello to {firstName}!</p>
          )}
          {thread.data.messages.map((m, i) => (
            <motion.div
              key={m.id}
              // Messages already there when the chat opens just fade up together;
              // a newly sent one pops out of the corner it was sent from.
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ ...springBouncy, delay: Math.min(i, 6) * 0.03 }}
              style={{ transformOrigin: m.mine ? "100% 100%" : "0% 100%" }}
              title={timeAgo(m.sentAt)}
              className={
                m.mine
                  ? "self-end max-w-[80%] bg-accent text-white rounded-[20px_20px_6px_20px] px-[15px] py-[11px] text-[14.5px] font-semibold leading-[1.5] shadow-[0_3px_0_var(--color-accent-deep)]"
                  : "self-start max-w-[80%] bg-white text-ink-2 rounded-[20px_20px_20px_6px] px-[15px] py-[11px] text-[14.5px] font-semibold leading-[1.5] shadow-[0_3px_0_var(--color-line)]"
              }
            >
              {m.body}
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Write a message…"
          aria-label={`Message ${firstName}`}
          disabled={!thread.data}
          className="flex-1 min-w-0 px-[15px] py-[11px] border-2 border-line rounded-full bg-white text-[14.5px] font-semibold focus:outline-3 focus:outline-sun"
        />
        <Button variant="primary" size="md" onClick={send} disabled={!thread.data || sending || !draft.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
