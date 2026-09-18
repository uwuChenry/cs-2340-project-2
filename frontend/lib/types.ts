export type WorkSetup = "Remote" | "Hybrid" | "Onsite";

export type Job = {
  id: string;
  title: string;
  company: string;
  mark: string;
  logoBg: string;
  location: string;
  setup: WorkSetup;
  salaryLow: number;
  salaryHigh: number;
  distanceMi: number;
  visa: boolean;
  posted: string;
  mapLeft: number;
  mapTop: number;
  address: string;
  skills: string[];
  about: string;
};

export const STAGES = ["Applied", "Review", "Interview", "Offer", "Closed"] as const;
export type Stage = (typeof STAGES)[number];

export type Candidate = {
  id: string;
  name: string;
  role: string;
  location: string;
  matchPct: number;
  skills: string[];
  note: string;
  stage: Stage;
  salaryExpectation: string;
  noticePeriod: string;
  appliedAgo: string;
  experience: { years: string; role: string; org: string }[];
};

export type ApplicationBase = {
  id: string;
  title: string;
  company: string;
  location: string;
  stageIndex: number;
  updated: string;
  next: string;
};

export type SavedSearch = {
  id: string;
  name: string;
  newCount: number;
};

export type Cluster = {
  left: number;
  top: number;
  size: number;
  count: number;
};

export type SetupFilter = "any" | "remote" | "onsite";

export type Filters = {
  q: string;
  loc: string;
  minSalary: number;
  setup: SetupFilter;
  radius: number;
  visa: boolean;
  skills: string[];
};

export type PrivacySettings = {
  name: boolean;
  contact: boolean;
  current: boolean;
  openToWork: boolean;
};

export type ViewMode = "list" | "split" | "map";
