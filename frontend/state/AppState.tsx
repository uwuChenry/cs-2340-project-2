"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  defaultHeadline,
  defaultPrivacy,
  initialSavedSearches,
  jobs,
} from "@/lib/mockData";
import type { Filters, PrivacySettings, ViewMode } from "@/lib/types";

const initialFilters: Filters = {
  q: "",
  loc: "",
  minSalary: 60,
  setup: "any",
  radius: 10,
  visa: false,
  skills: [],
};

type SavedSearchState = Record<string, boolean>;

type AppStateValue = {
  view: ViewMode;
  setView: (v: ViewMode) => void;

  filters: Filters;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  toggleSkillFilter: (skill: string) => void;
  resetFilters: () => void;

  cart: string[];
  toggleCart: (jobId: string) => void;
  clearCart: () => void;

  applied: Record<string, boolean>;
  applyJob: (jobId: string) => void;
  applyAll: (jobIds: string[]) => void;

  headline: string;
  setHeadline: (h: string) => void;

  privacy: PrivacySettings;
  togglePrivacy: (key: keyof PrivacySettings) => void;

  savedOn: SavedSearchState;
  toggleSavedSearch: (id: string) => void;
  searchSaved: boolean;
  saveSearch: () => void;

  openJobId: string | null;
  noteOpen: boolean;
  note: string;
  setNote: (n: string) => void;
  appendNote: (text: string) => void;
  openJob: (jobId: string, opts?: { noteOpen?: boolean }) => void;
  closeJob: () => void;
  cancelNote: () => void;
  submitNote: () => void;

  openCandId: string | null;
  msgOpen: boolean;
  openCandidate: (candId: string) => void;
  messageCandidate: (candId: string) => void;
  closeCandidate: () => void;

  toast: string;
  showToast: (msg: string) => void;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewMode>("split");
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const [cart, setCart] = useState<string[]>(["j2", "j5"]);
  const [applied, setApplied] = useState<Record<string, boolean>>({});

  const [headline, setHeadline] = useState(defaultHeadline);
  const [privacy, setPrivacy] = useState<PrivacySettings>(defaultPrivacy);

  const [savedOn, setSavedOn] = useState<SavedSearchState>(
    Object.fromEntries(initialSavedSearches.map((s) => [s.id, s.alertsOn])),
  );
  const [searchSaved, setSearchSaved] = useState(false);

  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");

  const [openCandId, setOpenCandId] = useState<string | null>(null);
  const [msgOpen, setMsgOpen] = useState(false);

  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }, []);

  const setFilter = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      setFilters((f) => ({ ...f, [key]: value }));
    },
    [],
  );

  const toggleSkillFilter = useCallback((skill: string) => {
    setFilters((f) => ({
      ...f,
      skills: f.skills.includes(skill) ? f.skills.filter((s) => s !== skill) : [...f.skills, skill],
    }));
  }, []);

  const resetFilters = useCallback(() => setFilters(initialFilters), []);

  const toggleCart = useCallback(
    (jobId: string) => {
      setCart((c) => {
        const has = c.includes(jobId);
        showToast(has ? "Removed from shortlist" : "Added to shortlist");
        return has ? c.filter((id) => id !== jobId) : [...c, jobId];
      });
    },
    [showToast],
  );

  const clearCart = useCallback(() => {
    setCart([]);
    showToast("Shortlist cleared");
  }, [showToast]);

  const applyJob = useCallback(
    (jobId: string) => {
      if (applied[jobId]) return;
      setApplied((a) => ({ ...a, [jobId]: true }));
      const job = jobs.find((j) => j.id === jobId);
      setOpenJobId(jobId);
      setNoteOpen(true);
      showToast(`Applied to ${job?.company ?? "the role"} — add a note?`);
    },
    [applied, showToast],
  );

  const applyAll = useCallback(
    (jobIds: string[]) => {
      setApplied((a) => {
        const next = { ...a };
        jobIds.forEach((id) => {
          next[id] = true;
        });
        return next;
      });
      showToast(`${jobIds.length} applications sent`);
    },
    [showToast],
  );

  const togglePrivacy = useCallback((key: keyof PrivacySettings) => {
    setPrivacy((p) => ({ ...p, [key]: !p[key] }));
  }, []);

  const toggleSavedSearch = useCallback((id: string) => {
    setSavedOn((s) => ({ ...s, [id]: !s[id] }));
  }, []);

  const saveSearch = useCallback(() => {
    setSearchSaved(true);
    showToast("Saved — you will get alerts on new matches");
  }, [showToast]);

  const openJob = useCallback((jobId: string, opts?: { noteOpen?: boolean }) => {
    setOpenJobId(jobId);
    setNoteOpen(opts?.noteOpen ?? false);
  }, []);

  const closeJob = useCallback(() => {
    setOpenJobId(null);
    setNoteOpen(false);
    setNote("");
  }, []);

  const appendNote = useCallback((text: string) => {
    setNote((n) => (n + text).slice(0, 400));
  }, []);

  const cancelNote = useCallback(() => {
    setNoteOpen(false);
    showToast("Application sent without a note");
  }, [showToast]);

  const submitNote = useCallback(() => {
    if (openJobId) {
      setApplied((a) => ({ ...a, [openJobId]: true }));
    }
    setNoteOpen(false);
    showToast("Application sent with your note");
  }, [openJobId, showToast]);

  const openCandidate = useCallback((candId: string) => {
    setOpenCandId(candId);
    setMsgOpen(false);
  }, []);

  const messageCandidate = useCallback((candId: string) => {
    setOpenCandId(candId);
    setMsgOpen(true);
  }, []);

  const closeCandidate = useCallback(() => {
    setOpenCandId(null);
    setMsgOpen(false);
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      view,
      setView,
      filters,
      setFilter,
      toggleSkillFilter,
      resetFilters,
      cart,
      toggleCart,
      clearCart,
      applied,
      applyJob,
      applyAll,
      headline,
      setHeadline,
      privacy,
      togglePrivacy,
      savedOn,
      toggleSavedSearch,
      searchSaved,
      saveSearch,
      openJobId,
      noteOpen,
      note,
      setNote: (n: string) => setNote(n.slice(0, 400)),
      appendNote,
      openJob,
      closeJob,
      cancelNote,
      submitNote,
      openCandId,
      msgOpen,
      openCandidate,
      messageCandidate,
      closeCandidate,
      toast,
      showToast,
    }),
    [
      view,
      filters,
      setFilter,
      toggleSkillFilter,
      resetFilters,
      cart,
      toggleCart,
      clearCart,
      applied,
      applyJob,
      applyAll,
      headline,
      privacy,
      togglePrivacy,
      savedOn,
      toggleSavedSearch,
      searchSaved,
      saveSearch,
      openJobId,
      noteOpen,
      note,
      appendNote,
      openJob,
      closeJob,
      cancelNote,
      submitNote,
      openCandId,
      msgOpen,
      openCandidate,
      messageCandidate,
      closeCandidate,
      toast,
      showToast,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
