// Converts API responses into the shapes the components render.
//
// The backend deliberately sends raw facts (ISO timestamps, whole-dollar
// salaries, enum values, coordinates). Turning those into "2d ago", "$150k" and
// map positions is presentation, so it lives here.

import type {
  ApiApplication,
  ApiCandidate,
  ApiCandidateDetail,
  ApiClusters,
  ApiExperience,
  ApiJob,
  ApiSavedSearch,
  ApiSeekerDetail,
  ApiSourcedCandidate,
} from "./apiTypes";
import type {
  ApplicationBase,
  CandidateDetail,
  Cluster,
  ExperienceEntry,
  Job,
  PipelineCard,
  SavedSearch,
  SourcedCandidate,
  WorkSetup,
} from "./types";

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const SETUP_LABELS: Record<ApiJob["setup"], WorkSetup> = {
  remote: "Remote",
  hybrid: "Hybrid",
  on_site: "Onsite",
};

// The schematic map has no real projection behind it, so pins are placed by
// squeezing coordinates into the Austin metro box. This keeps the existing map
// panel working with real data until it is swapped for a proper map library.
const MAP_BOUNDS = { minLat: 29.8, maxLat: 30.6, minLng: -98.05, maxLng: -97.55 };

export function projectToMap(lat: number | null, lng: number | null): { left: number; top: number } | null {
  if (lat === null || lng === null) return null;
  const { minLat, maxLat, minLng, maxLng } = MAP_BOUNDS;
  const clamp = (v: number) => Math.min(94, Math.max(6, v));
  return {
    left: clamp(((lng - minLng) / (maxLng - minLng)) * 100),
    top: clamp(((maxLat - lat) / (maxLat - minLat)) * 100),
  };
}

const toThousands = (dollars: number | null) => (dollars === null ? null : Math.round(dollars / 1000));

export function toJob(job: ApiJob): Job {
  const pin = projectToMap(job.latitude, job.longitude);
  return {
    id: String(job.id),
    title: job.title,
    company: job.company,
    mark: job.companyMark,
    logoBg: job.logoBg,
    location: job.location,
    setup: SETUP_LABELS[job.setup],
    salaryLow: toThousands(job.salaryMin),
    salaryHigh: toThousands(job.salaryMax),
    distanceMi: job.distanceMi,
    visa: job.visa,
    posted: timeAgo(job.postedAt),
    latitude: job.latitude,
    longitude: job.longitude,
    mapLeft: pin?.left ?? null,
    mapTop: pin?.top ?? null,
    address: job.address || job.location,
    skills: job.skills,
    matchedSkills: job.matchedSkills,
    matchPct: job.matchPct,
    recommended: job.recommended,
    level: job.level,
    teamSize: job.team_size,
    about: job.description,
  };
}

const NEXT_STEP_LABELS = ["Submitted", "In review", "Interview stage", "Offer received", "Role closed"];

export function toApplication(app: ApiApplication): ApplicationBase {
  return {
    id: String(app.id),
    title: app.title,
    company: app.company,
    location: app.location,
    stageIndex: app.stageIndex,
    updated: `Updated ${timeAgo(app.updatedAt)}`,
    next: app.nextAction || NEXT_STEP_LABELS[app.stageIndex] || "",
  };
}

export function toPipelineCard(candidate: ApiCandidate): PipelineCard {
  return {
    id: String(candidate.id),
    name: candidate.name,
    initials: candidate.initials,
    role: candidate.role,
    matchPct: candidate.matchPct,
    appliedAt: candidate.appliedAt,
  };
}

const yearOf = (iso: string) => iso.slice(0, 4);

function toExperience(entry: ApiExperience): ExperienceEntry {
  return {
    years: `${yearOf(entry.startDate)} — ${entry.endDate ? yearOf(entry.endDate) : "now"}`,
    role: entry.title,
    org: entry.company,
    detail: entry.description,
  };
}

export const toExperienceList = (entries: ApiExperience[]) => entries.map(toExperience);

const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase())
    .join("")
    .slice(0, 2);

export function applicationToDetail(detail: ApiCandidateDetail): CandidateDetail {
  return {
    kind: "application",
    id: String(detail.id),
    seekerId: String(detail.seekerId),
    jobId: String(detail.jobId),
    name: detail.name,
    initials: detail.initials,
    role: detail.role,
    location: detail.location,
    stageIndex: detail.stageIndex,
    appliedAgo: timeAgo(detail.appliedAt),
    note: detail.note || null,
    salaryExpectation: detail.salaryExpectation,
    noticePeriod: detail.noticePeriod,
    email: detail.email,
    currentEmployer: detail.currentEmployer,
    matchedSkills: detail.matchedSkills,
    missingSkills: detail.missingSkills,
    skills: detail.skills,
    experience: toExperienceList(detail.experience),
  };
}

export function seekerToDetail(seeker: ApiSeekerDetail): CandidateDetail {
  const matched = seeker.matchedSkills ?? [];
  return {
    kind: "seeker",
    id: String(seeker.id),
    seekerId: String(seeker.id),
    jobId: null,
    name: seeker.name,
    initials: initialsOf(seeker.name),
    role: seeker.role,
    location: seeker.location,
    stageIndex: null,
    appliedAgo: null,
    note: null,
    salaryExpectation: seeker.salaryExpectation,
    noticePeriod: seeker.noticePeriod,
    email: seeker.email,
    currentEmployer: seeker.currentEmployer,
    matchedSkills: matched,
    missingSkills: [],
    skills: seeker.skills,
    experience: toExperienceList(seeker.experience),
  };
}

export function toSourcedCandidate(candidate: ApiSourcedCandidate): SourcedCandidate {
  return {
    seekerId: String(candidate.seekerId),
    name: candidate.name,
    initials: candidate.initials,
    role: candidate.role,
    location: candidate.location,
    matchPct: candidate.matchPct,
    skills: candidate.skills,
    hasApplied: candidate.hasApplied,
  };
}

export function toSavedSearch(search: ApiSavedSearch): SavedSearch {
  return {
    id: String(search.id),
    name: search.name,
    newCount: search.newCount,
    alertsOn: search.alertsOn,
    filters: search.filters ?? {},
  };
}

export function toClusters(data: ApiClusters): Cluster[] {
  return data.points.flatMap((point) => {
    const pin = projectToMap(point.latitude, point.longitude);
    if (!pin) return [];
    return [{ left: pin.left, top: pin.top, size: Math.min(88, 34 + point.count * 6), count: point.count }];
  });
}
