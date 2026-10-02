import type { PrivacySettings } from "./types";

// The filter chips on the search screen. There is no "list all skills" endpoint
// yet, so this is the curated set the design shows.
export const skillFilterOptions = ["React", "TypeScript", "Node", "Mapbox", "Accessibility", "GraphQL"];

export const privacyFieldDefs: { key: keyof PrivacySettings; label: string; hint: string }[] = [
  { key: "name", label: "Show my full name", hint: "Otherwise recruiters see your initials" },
  { key: "contact", label: "Show contact details", hint: "Email and phone on your profile" },
  { key: "current", label: "Show current employer", hint: "Otherwise recruiters won't see where you work now" },
  { key: "openToWork", label: "Let recruiters know I'm looking", hint: "Puts you in recruiter search" },
];

export const notePrompts: { label: string; text: string }[] = [
  { label: "Why this team", text: "Your work on the map is the closest thing to what I want to build next. " },
  { label: "A project I'm proud of", text: "I shipped a clustered map view over 40k records last quarter and would love to walk you through it. " },
  { label: "When I can start", text: "I can start within four weeks and I already live nearby. " },
];

// Stage colours for stamps, progress bars and pipeline counts, in STAGES order.
// White text only ever sits on the darkened shades, which pass contrast.
export const STAGE_COLORS: { fill: string; text: string }[] = [
  { fill: "#2F6DB5", text: "#FFFFFF" }, // Applied
  { fill: "#F9D65C", text: "#5B3B00" }, // Review
  { fill: "#7A52B8", text: "#FFFFFF" }, // Interview
  { fill: "#3F8F24", text: "#FFFFFF" }, // Offer
  { fill: "#74685A", text: "#FFFFFF" }, // Closed
];

// Paper tints, thumbtack colours and tilts that cards on the job board rotate through.
export const PINNED_PAPERS = ["#FFF8E1", "#E6F5FF", "#FDEBE3", "#EEF8E4"];
export const PINNED_TACKS = ["#C23B38", "#F9D65C", "#2F6DB5", "#3F8F24"];
export const PINNED_TILTS = ["-1.2deg", "0.9deg", "-0.6deg", "1.3deg"];
