export type WorkSetup = "Remote" | "Hybrid" | "Onsite";

export type Job = {
  id: string;
  title: string;
  company: string;
  mark: string;
  logoBg: string;
  location: string;
  setup: WorkSetup;
  // Salary in thousands of dollars, which is how the UI prints it. Null when the
  // posting does not list a range.
  salaryLow: number | null;
  salaryHigh: number | null;
  // Null when the seeker or the posting has no coordinates; 0 means remote.
  distanceMi: number | null;
  visa: boolean;
  posted: string;
  latitude: number | null;
  longitude: number | null;
  // Position on the schematic map, as percentages. Null for postings with no
  // coordinates (remote roles), which simply get no pin.
  mapLeft: number | null;
  mapTop: number | null;
  address: string;
  skills: string[];
  // Which of `skills` the seeker has. Only the detail endpoint returns this.
  matchedSkills?: string[];
  matchPct: number;
  recommended: boolean;
  level: string;
  teamSize: string;
  about: string;
};

export const STAGES = ["Applied", "Review", "Interview", "Offer", "Closed"] as const;
export type Stage = (typeof STAGES)[number];

// The status values the API stores, in the same order as STAGES.
export const STAGE_STATUSES = ["applied", "review", "interview", "offer", "closed"] as const;

export type PipelineCard = {
  id: string;
  name: string;
  initials: string;
  role: string;
  matchPct: number;
  appliedAt: string;
};

export type ExperienceEntry = {
  years: string;
  role: string;
  org: string;
  detail: string;
};

// What the candidate sheet shows. It is built from either an application (the
// recruiter opened a pipeline card) or a bare seeker (a sourcing result who has
// not applied), so the application-only fields are optional.
export type CandidateDetail = {
  kind: "application" | "seeker";
  id: string;
  seekerId: string;
  jobId: string | null;
  name: string;
  initials: string;
  role: string;
  location: string;
  stageIndex: number | null;
  appliedAgo: string | null;
  note: string | null;
  salaryExpectation: string;
  noticePeriod: string;
  email: string | null;
  currentEmployer: string | null;
  matchedSkills: string[];
  missingSkills: string[];
  skills: string[];
  experience: ExperienceEntry[];
};

export type SourcedCandidate = {
  seekerId: string;
  name: string;
  initials: string;
  role: string;
  location: string;
  matchPct: number;
  skills: string[];
  hasApplied: boolean;
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
  alertsOn: boolean;
  filters: { skills?: string[]; location?: string; project?: string };
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

// A reference to whoever the recruiter has open in the candidate sheet.
export type CandidateRef = { kind: "application" | "seeker"; id: string };
