import type {
  ApplicationBase,
  Candidate,
  Cluster,
  Job,
  PrivacySettings,
  SavedSearch,
} from "./types";

export const SEEKER_NAME = "Maya Ellison";
export const SEEKER_INITIALS = "ME";

export const jobs: Job[] = [
  { id: "j1", title: "Senior Frontend Engineer", company: "Northline Labs", mark: "NL", logoBg: "#1B4DFF", location: "Austin, TX", setup: "Hybrid", salaryLow: 150, salaryHigh: 185, distanceMi: 4, visa: true, posted: "2d ago", mapLeft: 49, mapTop: 44, address: "1104 Rio Grande St", skills: ["React", "TypeScript", "Mapbox", "Accessibility"], about: "Own the candidate-facing surfaces: search, map, and the application flow. Small team, weekly releases, real design partnership." },
  { id: "j2", title: "Product Engineer, Growth", company: "Havenly", mark: "HV", logoBg: "#1F5A41", location: "Remote (US)", setup: "Remote", salaryLow: 135, salaryHigh: 160, distanceMi: 0, visa: false, posted: "4d ago", mapLeft: 24, mapTop: 63, address: "Fully distributed", skills: ["React", "Node", "Experimentation"], about: "Run the experiment pipeline end to end, from hypothesis to shipped surface. You will work directly with the head of product." },
  { id: "j3", title: "UI Engineer, Design Systems", company: "Cartwheel", mark: "CW", logoBg: "#8A3E1E", location: "Austin, TX", setup: "Onsite", salaryLow: 140, salaryHigh: 170, distanceMi: 9, visa: true, posted: "1w ago", mapLeft: 66, mapTop: 31, address: "300 W 6th St", skills: ["TypeScript", "Design Systems", "Figma"], about: "Maintain the component library used by nine product teams. Heavy emphasis on documentation and migration tooling." },
  { id: "j4", title: "Full Stack Engineer", company: "Mesa Point", mark: "MP", logoBg: "#4A4A8C", location: "Round Rock, TX", setup: "Hybrid", salaryLow: 125, salaryHigh: 150, distanceMi: 18, visa: false, posted: "3d ago", mapLeft: 78, mapTop: 18, address: "2500 Hesters Crossing", skills: ["Node", "Postgres", "React"], about: "Backend-leaning full stack work on the scheduling service. Comfortable owning migrations and on-call rotation." },
  { id: "j5", title: "Frontend Engineer, Maps", company: "Terrafold", mark: "TF", logoBg: "#1A1917", location: "Austin, TX", setup: "Hybrid", salaryLow: 145, salaryHigh: 175, distanceMi: 6, visa: true, posted: "1d ago", mapLeft: 38, mapTop: 57, address: "801 Barton Springs Rd", skills: ["React", "Mapbox", "WebGL", "TypeScript"], about: "Build interactive geospatial views for logistics planners. You will pair with data engineers on tile pipelines." },
  { id: "j6", title: "Senior Web Engineer", company: "Kestrel Health", mark: "KH", logoBg: "#0F6C7A", location: "San Marcos, TX", setup: "Onsite", salaryLow: 130, salaryHigh: 155, distanceMi: 31, visa: false, posted: "5d ago", mapLeft: 56, mapTop: 82, address: "700 N LBJ Dr", skills: ["React", "Accessibility", "Testing"], about: "Patient-facing scheduling and records UI with a hard accessibility bar. WCAG 2.2 AA is a requirement, not a goal." },
  { id: "j7", title: "Staff Engineer, Platform UI", company: "Orrick Data", mark: "OD", logoBg: "#6B3FA0", location: "Remote (US)", setup: "Remote", salaryLow: 180, salaryHigh: 215, distanceMi: 0, visa: true, posted: "6d ago", mapLeft: 14, mapTop: 26, address: "Fully distributed", skills: ["TypeScript", "GraphQL", "Design Systems"], about: "Set frontend direction across four product lines. Half architecture, half mentorship." },
];

export const mySkills = ["React", "TypeScript", "Mapbox", "Accessibility", "Node", "Testing", "GraphQL", "Figma"];

export const skillFilterOptions = ["React", "TypeScript", "Node", "Mapbox", "Accessibility", "GraphQL"];

export const seekerExperience = [
  { years: "2022 — now", role: "Frontend Engineer", org: "Fielder Logistics", detail: "Owned the planner map surface: clustering, radius filters, and offline tiles. Cut first-paint on the map view from 2.4s to 900ms." },
  { years: "2020 — 2022", role: "Software Engineer", org: "Basalt Software", detail: "Built the design system used by three product teams and ran the accessibility audit process." },
];

export const seekerEducation = { years: "2017 — 2021", degree: "B.S. Computer Science", org: "University of Texas at Austin" };

export const defaultHeadline = "Frontend engineer focused on search, maps and accessible UI";

export const defaultPrivacy: PrivacySettings = { name: true, contact: false, current: true, openToWork: true };

export const privacyFieldDefs: { key: keyof PrivacySettings; label: string; hint: string }[] = [
  { key: "name", label: "Show my full name", hint: "Otherwise recruiters see initials" },
  { key: "contact", label: "Show contact details", hint: "Email and phone on your profile" },
  { key: "current", label: "Show current employer", hint: "Hidden from your current company either way" },
  { key: "openToWork", label: "Signal open to work", hint: "Surfaces you in recruiter search" },
];

export const baseApplications: ApplicationBase[] = [
  { id: "a1", title: "Frontend Engineer, Maps", company: "Terrafold", location: "Austin, TX", stageIndex: 2, updated: "Updated 1d ago", next: "Onsite loop Thu" },
  { id: "a2", title: "UI Engineer, Design Systems", company: "Cartwheel", location: "Austin, TX", stageIndex: 1, updated: "Updated 3d ago", next: "In review" },
  { id: "a3", title: "Staff Engineer, Platform UI", company: "Orrick Data", location: "Remote", stageIndex: 3, updated: "Updated 5h ago", next: "Offer received" },
  { id: "a4", title: "Full Stack Engineer", company: "Mesa Point", location: "Round Rock, TX", stageIndex: 4, updated: "Updated 2w ago", next: "Role closed" },
];

export const notePrompts: { label: string; text: string }[] = [
  { label: "Why this team", text: "Your work on the map surface is the closest match to what I want to be building next. " },
  { label: "Relevant project", text: "I shipped a clustered map view over 40k records last quarter — happy to walk through the tile strategy. " },
  { label: "Availability", text: "I can start within four weeks and I am in this metro already. " },
];

export const openRoleTitle = "Senior Frontend Engineer";

export const candidates: Candidate[] = [
  {
    id: "c1", name: "Dev Raman", role: "Senior Frontend Engineer", location: "Austin, TX · 5 mi", matchPct: 94,
    skills: ["React", "TypeScript", "Mapbox", "WebGL"],
    note: "I spent the last two years on a logistics mapping product, mostly vector tiles and clustering at scale. Your posting is the first I have seen that treats the map as the primary surface rather than a tab.",
    stage: "Review", salaryExpectation: "$155k base", noticePeriod: "4 weeks", appliedAgo: "3 days ago",
    experience: [
      { years: "2022 — now", role: "Senior Frontend Engineer", org: "Fielder Logistics" },
      { years: "2019 — 2022", role: "Frontend Engineer", org: "Basalt Software" },
    ],
  },
  {
    id: "c2", name: "Priya Shah", role: "UI Engineer", location: "Remote · CST", matchPct: 88,
    skills: ["React", "Design Systems", "Figma", "Testing"],
    note: "Design systems are my thing. I migrated 140 components off a legacy library last year without a freeze window.",
    stage: "Interview", salaryExpectation: "$148k base", noticePeriod: "2 weeks", appliedAgo: "6 days ago",
    experience: [
      { years: "2021 — now", role: "UI Engineer", org: "Palisade Software" },
      { years: "2018 — 2021", role: "Frontend Developer", org: "Grayline Labs" },
    ],
  },
  {
    id: "c3", name: "Marcus Bell", role: "Product Engineer", location: "Round Rock, TX · 17 mi", matchPct: 81,
    skills: ["React", "Node", "Postgres"],
    note: "Generalist who likes owning a feature end to end. Happy to talk through the scheduling rewrite I led.",
    stage: "Applied", salaryExpectation: "$132k base", noticePeriod: "Immediate", appliedAgo: "1 day ago",
    experience: [
      { years: "2020 — now", role: "Product Engineer", org: "Round Table Systems" },
      { years: "2017 — 2020", role: "Software Engineer", org: "Ferro Apps" },
    ],
  },
  {
    id: "c4", name: "Lena Ortiz", role: "Frontend Engineer", location: "Austin, TX · 2 mi", matchPct: 79,
    skills: ["TypeScript", "Accessibility", "React"],
    note: "Accessibility is where I do my best work — I run the audit process at my current company.",
    stage: "Applied", salaryExpectation: "$138k base", noticePeriod: "3 weeks", appliedAgo: "2 days ago",
    experience: [
      { years: "2021 — now", role: "Frontend Engineer", org: "Kestrel Health" },
      { years: "2019 — 2021", role: "Web Developer", org: "Cedarwood Digital" },
    ],
  },
  {
    id: "c5", name: "Tomas Vieira", role: "Staff Engineer", location: "Remote · EST", matchPct: 76,
    skills: ["GraphQL", "TypeScript", "Node"],
    note: "Looking for a role with real architecture ownership after five years of platform work.",
    stage: "Offer", salaryExpectation: "$190k base", noticePeriod: "6 weeks", appliedAgo: "12 days ago",
    experience: [
      { years: "2019 — now", role: "Staff Engineer", org: "Orrick Data" },
      { years: "2016 — 2019", role: "Senior Engineer", org: "Vantage Point" },
    ],
  },
];

export const applicantClusters: Cluster[] = [
  { left: 42, top: 46, size: 78, count: 31 },
  { left: 70, top: 28, size: 52, count: 14 },
  { left: 22, top: 68, size: 42, count: 8 },
  { left: 62, top: 76, size: 34, count: 4 },
];

export const initialSavedSearches: (SavedSearch & { alertsOn: boolean })[] = [
  { id: "s1", name: "React + Mapbox, Austin 25mi", newCount: 6, alertsOn: true },
  { id: "s2", name: "Design systems, remote US", newCount: 2, alertsOn: false },
  { id: "s3", name: "New grads, accessibility focus", newCount: 11, alertsOn: true },
];

export const postRoleSkills = ["React", "TypeScript", "Mapbox", "Accessibility"];
