import type { PrivacySettings } from "./types";

// The filter chips on the search screen. There is no "list all skills" endpoint
// yet, so this is the curated set the design shows.
export const skillFilterOptions = ["React", "TypeScript", "Node", "Mapbox", "Accessibility", "GraphQL"];

export const privacyFieldDefs: { key: keyof PrivacySettings; label: string; hint: string }[] = [
  { key: "name", label: "Show my full name", hint: "Otherwise recruiters see initials" },
  { key: "contact", label: "Show contact details", hint: "Email and phone on your profile" },
  { key: "current", label: "Show current employer", hint: "Otherwise recruiters won't see where you work now" },
  { key: "openToWork", label: "Signal open to work", hint: "Surfaces you in recruiter search" },
];

export const notePrompts: { label: string; text: string }[] = [
  { label: "Why this team", text: "Your work on the map surface is the closest match to what I want to be building next. " },
  { label: "Relevant project", text: "I shipped a clustered map view over 40k records last quarter — happy to walk through the tile strategy. " },
  { label: "Availability", text: "I can start within four weeks and I am in this metro already. " },
];
