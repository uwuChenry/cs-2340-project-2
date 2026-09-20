// Response shapes as the Django serializers emit them. The UI works with the
// friendlier types in ./types.ts; ./adapters.ts converts between the two.

export type ApiRole = "job_seeker" | "recruiter" | "admin";

export type ApiSessionUser = {
  id: number;
  username: string;
  name: string;
  email: string;
  role: ApiRole | null;
  // Job seekers only; shown in the navbar avatar.
  photoUrl: string | null;
};

export type ApiAccount = { username: string; email: string };

export type ApiPage<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ApiJob = {
  id: number;
  title: string;
  company: string;
  companyMark: string;
  logoBg: string;
  location: string;
  city: string;
  state: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  setup: "remote" | "hybrid" | "on_site";
  visa: boolean;
  level: string;
  team_size: string;
  description: string;
  skills: string[];
  matchPct: number;
  recommended: boolean;
  distanceMi: number | null;
  shortlisted: boolean;
  applied: boolean;
  postedAt: string;
  // Detail endpoint only.
  companyWebsite?: string;
  matchedSkills?: string[];
};

export type ApiApplication = {
  id: number;
  jobId: number;
  title: string;
  company: string;
  companyMark: string;
  logoBg: string;
  location: string;
  status: string;
  stage: string;
  stageIndex: number;
  nextAction: string;
  note: string;
  appliedAt: string;
  updatedAt: string;
};

export type ApiShortlistItem = {
  id: number;
  job: ApiJob;
  addedAt: string;
};

export type ApiApplyAllResult = {
  created: number;
  alreadyApplied: number;
  createdJobIds: number[];
  skippedJobIds: number[];
};

export type ApiExperience = {
  id: number;
  company: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
};

export type ApiEducation = {
  id: number;
  school: string;
  degree: string;
  fieldOfStudy: string;
  startYear: number | null;
  graduationYear: number | null;
};

export type ApiProfileLink = { id: number; label: string; url: string };

export type ApiPrivacy = {
  name: boolean;
  contact: boolean;
  current: boolean;
  openToWork: boolean;
};

export type ApiProject = { id: number; name: string; description: string; url: string };

export type ApiProfile = {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  initials: string;
  photoUrl: string | null;
  email: string;
  headline: string;
  about: string;
  location: string;
  latitude: string | null;
  longitude: string | null;
  openToRemote: boolean;
  salaryExpectation: string;
  noticePeriod: string;
  skills: string[];
  experience: ApiExperience[];
  education: ApiEducation[];
  links: ApiProfileLink[];
  projects: ApiProject[];
  privacy: ApiPrivacy;
};

export type ApiRecruiterProfile = {
  id: number;
  name: string;
  initials: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  company: string;
  companyMark: string;
  companyWebsite: string;
};

export type ApiRegisterBody = {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "job_seeker" | "recruiter";
  company?: string;
  title?: string;
};

export type ApiCandidate = {
  id: number;
  seekerId: number;
  jobId: number;
  jobTitle: string;
  name: string;
  initials: string;
  role: string;
  location: string;
  status: string;
  stage: string;
  stageIndex: number;
  skills: string[];
  matchPct: number;
  note: string;
  latitude: number | null;
  longitude: number | null;
  appliedAt: string;
  updatedAt: string;
};

export type ApiCandidateDetail = ApiCandidate & {
  email: string | null;
  currentEmployer: string | null;
  salaryExpectation: string;
  noticePeriod: string;
  openToWork: boolean;
  experience: ApiExperience[];
  matchedSkills: string[];
  missingSkills: string[];
  projects: { id: number; name: string; description: string; url: string }[];
};

export type ApiSeekerDetail = {
  id: number;
  name: string;
  role: string;
  location: string;
  skills: string[];
  experience: ApiExperience[];
  email: string | null;
  currentEmployer: string | null;
  openToWork: boolean;
  salaryExpectation: string;
  noticePeriod: string;
  matchPct?: number;
  matchedSkills?: string[];
};

export type ApiSourcedCandidate = {
  seekerId: number;
  name: string;
  role: string;
  location: string;
  openToWork: boolean;
  skills: string[];
  initials: string;
  matchPct: number;
  latitude: number | null;
  longitude: number | null;
  hasApplied: boolean;
};

export type ApiCandidateSearch = {
  count: number;
  targetJob: string | null;
  results: ApiSourcedCandidate[];
};

export type ApiPipeline = {
  job: { id: number; title: string; status: string };
  total: number;
  columns: {
    status: string;
    label: string;
    count: number;
    candidates: ApiCandidate[];
  }[];
};

export type ApiClusters = {
  points: { location: string; count: number; latitude: number; longitude: number }[];
  withoutLocation: number;
};

export type ApiRecruiterJob = {
  id: number;
  title: string;
  description: string;
  company: string;
  status: "draft" | "published" | "closed";
  city: string;
  state: string;
  address: string;
  latitude: string | null;
  longitude: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  setup: "remote" | "hybrid" | "on_site";
  visa: boolean;
  level: string;
  teamSize: string;
  skills: string[];
  applicantCount: number;
  postedAt: string;
};

export type ApiSavedSearch = {
  id: number;
  name: string;
  filters: { skills?: string[]; location?: string; project?: string };
  alertsOn: boolean;
  newCount: number;
  lastViewedAt: string | null;
};

export type ApiMessage = {
  id: number;
  body: string;
  senderName: string;
  mine: boolean;
  sentAt: string;
};

export type ApiThread = {
  id: number;
  withName: string;
  jobTitle: string | null;
  messages: ApiMessage[];
  lastMessageAt: string | null;
};
