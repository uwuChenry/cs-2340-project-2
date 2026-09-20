"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { http, messageOf } from "@/lib/api";
import type { ApiApplication, ApiApplyAllResult, ApiProfile, ApiShortlistItem } from "@/lib/apiTypes";
import { toJob } from "@/lib/adapters";
import type { CandidateRef, Filters, Job, ViewMode } from "@/lib/types";
import { useAuth } from "./AuthState";

const initialFilters: Filters = {
  q: "",
  loc: "",
  minSalary: 60,
  setup: "any",
  radius: 10,
  visa: false,
  skills: [],
};

// What is loaded once for a signed-in seeker and then kept in step with the
// server as they shortlist and apply. It is keyed by user id so that signing out
// (or switching accounts) hides the previous person's data without needing to
// clear it from an effect.
type SeekerData = {
  userId: number;
  shortlist: Job[];
  applied: Record<string, boolean>;
  skills: string[];
};

const NO_JOBS: Job[] = [];
const NO_IDS: string[] = [];
const NO_APPLIED: Record<string, boolean> = {};
const NO_SKILLS: string[] = [];

type AppStateValue = {
  view: ViewMode;
  setView: (v: ViewMode) => void;

  filters: Filters;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  toggleSkillFilter: (skill: string) => void;
  resetFilters: () => void;

  // False until the signed-in seeker's shortlist and applications have loaded,
  // so pages can tell "still loading" apart from "genuinely empty".
  seekerReady: boolean;
  // The seeker's own skills, used to explain why a role was recommended.
  mySkills: string[];
  setMySkills: (skills: string[]) => void;

  shortlist: Job[];
  cart: string[];
  toggleCart: (job: Job) => Promise<void>;
  clearCart: () => Promise<void>;

  applied: Record<string, boolean>;
  applyJob: (jobId: string) => Promise<void>;
  applyAll: (jobIds: string[]) => Promise<boolean>;

  openJobId: string | null;
  noteOpen: boolean;
  note: string;
  setNote: (n: string) => void;
  appendNote: (text: string) => void;
  openJob: (jobId: string, opts?: { noteOpen?: boolean }) => void;
  closeJob: () => void;
  cancelNote: () => void;
  submitNote: () => Promise<void>;

  openCand: CandidateRef | null;
  msgOpen: boolean;
  setMsgOpen: (open: boolean) => void;
  openCandidate: (ref: CandidateRef) => void;
  messageCandidate: (ref: CandidateRef) => void;
  closeCandidate: () => void;

  // Recruiter pages share one "current opening" so the pipeline, the sourcing
  // page and the cluster map all talk about the same role.
  recruiterJobId: string | null;
  setRecruiterJobId: (id: string | null) => void;
  // Bumped after a change made in a sheet (e.g. advancing a stage) so pages
  // showing the same data know to reload it.
  dataVersion: number;
  bumpData: () => void;

  toast: string;
  showToast: (msg: string) => void;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [view, setView] = useState<ViewMode>("split");
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const [seekerData, setSeekerData] = useState<SeekerData | null>(null);

  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNoteRaw] = useState("");

  const [openCand, setOpenCand] = useState<CandidateRef | null>(null);
  const [msgOpen, setMsgOpen] = useState(false);

  const [recruiterJobId, setRecruiterJobId] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }, []);

  const seekerId = user?.role === "job_seeker" ? user.id : null;

  // Load the seeker's shortlist, application ids and skills once per sign-in.
  useEffect(() => {
    if (seekerId === null) return;
    let alive = true;
    Promise.all([
      http.get<ApiShortlistItem[]>("/api/shortlist/"),
      http.get<ApiApplication[]>("/api/applications/"),
      http.get<ApiProfile>("/api/profile/"),
    ])
      .then(([shortlistItems, applications, profile]) => {
        if (!alive) return;
        setSeekerData({
          userId: seekerId,
          shortlist: shortlistItems.map((item) => toJob(item.job)),
          applied: Object.fromEntries(applications.map((a) => [String(a.jobId), true])),
          skills: profile.skills,
        });
      })
      .catch((e) => alive && showToast(messageOf(e)));
    return () => {
      alive = false;
    };
  }, [seekerId, showToast]);

  const active = seekerId !== null && seekerData?.userId === seekerId ? seekerData : null;
  const shortlist = active?.shortlist ?? NO_JOBS;
  const applied = active?.applied ?? NO_APPLIED;
  const mySkills = active?.skills ?? NO_SKILLS;
  const cart = shortlist.length ? shortlist.map((j) => j.id) : NO_IDS;

  function updateSeeker(update: (data: SeekerData) => SeekerData) {
    setSeekerData((data) => (data && data.userId === seekerId ? update(data) : data));
  }

  // Everything that writes to the seeker's data goes through here: send the
  // visitor to sign in if they have no session, and refuse other roles.
  function requireSeeker(action: string): boolean {
    if (!user) {
      showToast(`Sign in to ${action}`);
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return false;
    }
    if (user.role !== "job_seeker") {
      showToast("Only job seeker accounts can do that");
      return false;
    }
    return true;
  }

  const setFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
  }, []);

  const toggleSkillFilter = useCallback((skill: string) => {
    setFilters((f) => ({
      ...f,
      skills: f.skills.includes(skill) ? f.skills.filter((s) => s !== skill) : [...f.skills, skill],
    }));
  }, []);

  const resetFilters = useCallback(() => setFilters(initialFilters), []);

  async function toggleCart(job: Job) {
    if (!requireSeeker("save roles to your shortlist")) return;
    const has = shortlist.some((j) => j.id === job.id);
    // Optimistic: flip it immediately, then undo if the server refuses.
    updateSeeker((d) => ({
      ...d,
      shortlist: has ? d.shortlist.filter((j) => j.id !== job.id) : [...d.shortlist, job],
    }));
    try {
      if (has) await http.delete(`/api/shortlist/${job.id}/`);
      else await http.post("/api/shortlist/", { job: Number(job.id) });
      showToast(has ? "Removed from shortlist" : "Added to shortlist");
    } catch (e) {
      updateSeeker((d) => ({
        ...d,
        shortlist: has ? [...d.shortlist, job] : d.shortlist.filter((j) => j.id !== job.id),
      }));
      showToast(messageOf(e));
    }
  }

  async function clearCart() {
    if (!requireSeeker("manage your shortlist")) return;
    try {
      await http.delete("/api/shortlist/clear/");
      updateSeeker((d) => ({ ...d, shortlist: [] }));
      showToast("Shortlist cleared");
    } catch (e) {
      showToast(messageOf(e));
    }
  }

  const openJob = useCallback((jobId: string, opts?: { noteOpen?: boolean }) => {
    setOpenJobId(jobId);
    setNoteOpen(opts?.noteOpen ?? false);
  }, []);

  const closeJob = useCallback(() => {
    setOpenJobId(null);
    setNoteOpen(false);
    setNoteRaw("");
  }, []);

  async function applyJob(jobId: string) {
    if (!requireSeeker("apply to roles")) return;
    if (applied[jobId]) return;
    try {
      const application = await http.post<ApiApplication>("/api/applications/apply/", { job: Number(jobId) });
      // Applying moves the job out of the shortlist on the server; mirror that.
      updateSeeker((d) => ({
        ...d,
        applied: { ...d.applied, [jobId]: true },
        shortlist: d.shortlist.filter((j) => j.id !== jobId),
      }));
      setOpenJobId(jobId);
      setNoteOpen(true);
      showToast(`Applied to ${application.company} — add a note?`);
    } catch (e) {
      showToast(messageOf(e));
    }
  }

  async function applyAll(jobIds: string[]): Promise<boolean> {
    if (!requireSeeker("apply to roles")) return false;
    try {
      const result = await http.post<ApiApplyAllResult>("/api/applications/apply-all/", {
        jobs: jobIds.map(Number),
      });
      updateSeeker((d) => ({
        ...d,
        applied: {
          ...d.applied,
          ...Object.fromEntries([...result.createdJobIds, ...result.skippedJobIds].map((id) => [String(id), true])),
        },
        shortlist: d.shortlist.filter((j) => !jobIds.includes(j.id)),
      }));
      const skipped = result.alreadyApplied ? ` (${result.alreadyApplied} already applied)` : "";
      showToast(`${result.created} applications sent${skipped}`);
      return true;
    } catch (e) {
      showToast(messageOf(e));
      return false;
    }
  }

  const appendNote = useCallback((text: string) => {
    setNoteRaw((n) => (n + text).slice(0, 400));
  }, []);

  const cancelNote = useCallback(() => {
    setNoteOpen(false);
    showToast("Application sent without a note");
  }, [showToast]);

  // The application already exists by the time the note box opens (apply is
  // one click), so submitting the note re-posts to the same endpoint, which
  // updates the existing application instead of creating a second one.
  async function submitNote() {
    if (!openJobId) return;
    const text = note.trim();
    if (!text) {
      setNoteOpen(false);
      showToast("Application sent without a note");
      return;
    }
    try {
      await http.post("/api/applications/apply/", { job: Number(openJobId), note: text });
      setNoteOpen(false);
      showToast("Application sent with your note");
    } catch (e) {
      showToast(messageOf(e));
    }
  }

  const openCandidate = useCallback((ref: CandidateRef) => {
    setOpenCand(ref);
    setMsgOpen(false);
  }, []);

  const messageCandidate = useCallback((ref: CandidateRef) => {
    setOpenCand(ref);
    setMsgOpen(true);
  }, []);

  const closeCandidate = useCallback(() => {
    setOpenCand(null);
    setMsgOpen(false);
  }, []);

  const bumpData = useCallback(() => setDataVersion((v) => v + 1), []);

  const value: AppStateValue = {
    view,
    setView,
    filters,
    setFilter,
    toggleSkillFilter,
    resetFilters,
    seekerReady: active !== null,
    mySkills,
    setMySkills: (skills) => updateSeeker((d) => ({ ...d, skills })),
    shortlist,
    cart,
    toggleCart,
    clearCart,
    applied,
    applyJob,
    applyAll,
    openJobId,
    noteOpen,
    note,
    setNote: (n) => setNoteRaw(n.slice(0, 400)),
    appendNote,
    openJob,
    closeJob,
    cancelNote,
    submitNote,
    openCand,
    msgOpen,
    setMsgOpen,
    openCandidate,
    messageCandidate,
    closeCandidate,
    recruiterJobId,
    setRecruiterJobId,
    dataVersion,
    bumpData,
    toast,
    showToast,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
