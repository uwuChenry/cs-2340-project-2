"use client";

import { type KeyboardEvent, useRef, useState } from "react";
import { ApiError, http, messageOf } from "@/lib/api";
import type { ApiProfile } from "@/lib/apiTypes";
import { useAppState } from "@/state/AppState";
import ProfileCard from "./ProfileCard";
import { Avatar } from "./ui/Avatar";
import Button from "./ui/Button";
import { FieldError, Label, TextArea, TextInput } from "./ui/Field";
import Toggle from "./ui/Toggle";

export type SaveResult = { ok: boolean; errors: Record<string, string[]> };

type BlockProps = {
  profile: ApiProfile;
  // PATCHes /api/profile/ and folds the reply into the page's copy of the profile.
  save: (changes: Record<string, unknown>, success?: string) => Promise<SaveResult>;
};

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

// ---------------------------------------------------------------- header

type Draft = Partial<{
  firstName: string;
  lastName: string;
  headline: string;
  location: string;
  salaryExpectation: string;
  noticePeriod: string;
  openToRemote: boolean;
}>;

/**
 * The top of the profile: photo, name, headline, where you are and what you are
 * looking for. Editing it opens the photo controls and every one of those fields.
 */
export function HeaderBlock({
  profile,
  save,
  onProfile,
  onNameChanged,
}: BlockProps & {
  // For changes that come back as a whole profile (photo upload/removal).
  onProfile: (profile: ApiProfile) => void;
  // The navbar shows the name and photo from the session, so it needs a nudge.
  onNameChanged: () => void;
}) {
  const { showToast } = useAppState();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const text = (key: Exclude<keyof Draft, "openToRemote">): string => draft[key] ?? profile[key];
  const openToRemote = draft.openToRemote ?? profile.openToRemote;
  const pinned = profile.latitude !== null && profile.longitude !== null;
  const set = (key: Exclude<keyof Draft, "openToRemote">) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  function startEditing() {
    setDraft({});
    setErrors({});
    setPhotoError(null);
    setEditing(true);
  }

  async function saveChanges() {
    setSaving(true);
    setErrors({});
    const nameChanged = "firstName" in draft || "lastName" in draft;
    const result = await save(draft, "Profile saved");
    setSaving(false);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    if (nameChanged) onNameChanged();
    setEditing(false);
    setDraft({});
  }

  async function uploadPhoto(file: File) {
    setPhotoError(null);
    if (!PHOTO_TYPES.includes(file.type)) {
      setPhotoError("Please choose a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setPhotoError("That photo is over 5 MB. Please choose a smaller one.");
      return;
    }
    setPhotoBusy(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      onProfile(await http.upload<ApiProfile>("/api/profile/photo/", form));
      onNameChanged();
      showToast("Photo updated");
    } catch (e) {
      setPhotoError(e instanceof ApiError && e.fieldErrors.photo ? e.fieldErrors.photo.join(" ") : messageOf(e));
    } finally {
      setPhotoBusy(false);
      // Lets the same file be picked again after a failure.
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      onProfile(await http.delete<ApiProfile>("/api/profile/photo/"));
      onNameChanged();
      showToast("Photo removed");
    } catch (e) {
      setPhotoError(messageOf(e));
    } finally {
      setPhotoBusy(false);
    }
  }

  function pinLocation() {
    if (!navigator.geolocation) {
      showToast("Your browser can't share its location");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await save(
          { latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) },
          "Location pinned — job distances are measured from here",
        );
        setLocating(false);
      },
      (failure) => {
        setLocating(false);
        showToast(failure.code === failure.PERMISSION_DENIED ? "Location permission was denied" : "Couldn't get your location");
      },
      { timeout: 10000 },
    );
  }

  if (!editing) {
    const facts = [
      profile.location,
      profile.openToRemote ? "Open to remote" : "",
      profile.salaryExpectation ? `Expects ${profile.salaryExpectation}` : "",
      profile.noticePeriod ? `Notice: ${profile.noticePeriod}` : "",
    ].filter(Boolean);

    return (
      <ProfileCard editing={false} onEdit={startEditing}>
        <div className="flex gap-5 items-start pr-16">
          <Avatar initials={profile.initials} src={profile.photoUrl} size={88} radius="square" />
          <div className="min-w-0">
            <h1 className="m-0 mb-1 text-[26px] font-semibold tracking-[-0.02em]">{profile.name}</h1>
            <p className={`m-0 mb-2.5 text-[15px] leading-[1.45] ${profile.headline ? "text-ink-3" : "text-muted-2"}`}>
              {profile.headline || "Add a headline so recruiters know what you do."}
            </p>
            {facts.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-muted">
                {facts.map((fact) => (
                  <span key={fact}>{fact}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </ProfileCard>
    );
  }

  return (
    <ProfileCard editing onEdit={startEditing}>
      <div>
        <div className="flex items-center gap-4 mb-5">
          <Avatar initials={profile.initials} src={profile.photoUrl} size={88} radius="square" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInput}
                type="file"
                accept={PHOTO_TYPES.join(",")}
                hidden
                onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
                aria-label="Choose a profile photo"
              />
              <Button variant="secondary" onClick={() => fileInput.current?.click()} disabled={photoBusy}>
                {photoBusy ? "Working…" : profile.photoUrl ? "Change photo" : "Upload photo"}
              </Button>
              {profile.photoUrl && (
                <button
                  onClick={removePhoto}
                  disabled={photoBusy}
                  className="border-0 bg-transparent p-0 text-[12.5px] text-muted underline cursor-pointer hover:text-danger disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="m-0 mt-1.5 text-[12px] text-muted-2">JPEG, PNG or WebP, up to 5 MB. It&rsquo;s cropped to a square.</p>
            {photoError && (
              <p role="alert" className="m-0 mt-1.5 text-[12.5px] text-danger">
                {photoError}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <Label>First name</Label>
          <TextInput value={text("firstName")} onChange={set("firstName")} autoComplete="given-name" />
          <FieldError messages={errors.firstName} />
        </div>
        <div>
          <Label>Last name</Label>
          <TextInput value={text("lastName")} onChange={set("lastName")} autoComplete="family-name" />
          <FieldError messages={errors.lastName} />
        </div>
        <div className="sm:col-span-2">
          <Label>Headline</Label>
          <TextInput
            value={text("headline")}
            onChange={set("headline")}
            placeholder="e.g. Frontend engineer focused on maps and accessible UI"
          />
          <FieldError messages={errors.headline} />
        </div>
        <div className="sm:col-span-2">
          <Label>Location</Label>
          <TextInput value={text("location")} onChange={set("location")} placeholder="City, State" />
          <FieldError messages={errors.location} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
            <Button variant="secondary" onClick={pinLocation} disabled={locating}>
              {locating ? "Finding you…" : pinned ? "Update pinned location" : "Use my current location"}
            </Button>
            {pinned && (
              <>
                <span className="text-[12.5px] text-success">Pinned ✓</span>
                <button
                  onClick={() => save({ latitude: null, longitude: null }, "Pinned location cleared")}
                  className="border-0 bg-transparent p-0 text-[12.5px] text-muted underline cursor-pointer hover:text-ink"
                >
                  Clear
                </button>
              </>
            )}
          </div>
          <p className="m-0 mt-1.5 text-[12px] leading-[1.5] text-muted-2">
            Pinning your location lets Roster show how far each role is and filter by commute radius. It&rsquo;s only used to
            measure distance. Recruiters only ever get an approximate area (about a mile), never your exact spot.
          </p>
        </div>
        <div>
          <Label>Salary expectation</Label>
          <TextInput value={text("salaryExpectation")} onChange={set("salaryExpectation")} placeholder="e.g. $150k base" />
        </div>
        <div>
          <Label>Notice period</Label>
          <TextInput value={text("noticePeriod")} onChange={set("noticePeriod")} placeholder="e.g. 2 weeks" />
        </div>
      </div>

      <button
        onClick={() => setDraft((d) => ({ ...d, openToRemote: !openToRemote }))}
        className="mt-3.5 w-full flex items-center justify-between gap-3 border-0 bg-transparent py-2 cursor-pointer text-left"
      >
        <span>
          <span className="block text-[13.5px]">Open to remote roles</span>
          <span className="block text-xs text-muted-2 mt-0.5">Include remote postings in your recommendations</span>
        </span>
        <Toggle on={openToRemote} />
      </button>

      <div className="flex justify-end gap-2 border-t border-line-soft pt-4 mt-2">
        <Button variant="secondary" size="md" onClick={() => setEditing(false)} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" size="md" onClick={saveChanges} disabled={saving || Object.keys(draft).length === 0}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </ProfileCard>
  );
}

// ---------------------------------------------------------------- about

export function AboutBlock({ profile, save }: BlockProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  function startEditing() {
    setDraft(profile.about);
    setErrors({});
    setEditing(true);
  }

  async function commit() {
    setSaving(true);
    const result = await save({ about: draft.trim() }, "About saved");
    setSaving(false);
    if (result.ok) setEditing(false);
    else setErrors(result.errors);
  }

  return (
    <ProfileCard title="About" editing={editing} onEdit={startEditing}>
      {editing ? (
        <>
          <TextArea
            rows={5}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="A few lines on what you do best and what you want next."
            autoFocus
          />
          <FieldError messages={errors.about} />
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="secondary" size="md" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={commit} disabled={saving || draft.trim() === profile.about.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </>
      ) : profile.about ? (
        <p className="m-0 text-[14px] leading-[1.65] text-ink-3 whitespace-pre-line">{profile.about}</p>
      ) : (
        <p className="m-0 text-[13.5px] text-muted">Tell recruiters what you do best and what you want next.</p>
      )}
    </ProfileCard>
  );
}

// ---------------------------------------------------------------- skills

export function SkillsBlock({ profile, save }: BlockProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function change(skills: string[]) {
    setBusy(true);
    setProblem(null);
    const result = await save({ skills });
    setBusy(false);
    if (!result.ok) setProblem(Object.values(result.errors).flat().join(" ") || "Couldn't save that change.");
    return result.ok;
  }

  async function add() {
    const name = draft.trim();
    if (!name) return;
    if (profile.skills.some((s) => s.toLowerCase() === name.toLowerCase())) {
      setDraft("");
      return;
    }
    if (await change([...profile.skills, name])) setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    add();
  }

  return (
    <ProfileCard
      title="Skills"
      editing={editing}
      onEdit={() => setEditing(true)}
      action={
        <Button
          variant="primary"
          onClick={() => {
            setEditing(false);
            setDraft("");
            setProblem(null);
          }}
        >
          Done
        </Button>
      }
    >
      {profile.skills.length === 0 && !editing && (
        <p className="m-0 text-[13.5px] text-muted">Skills drive your match score on every role.</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {profile.skills.map((skill) => (
          <span
            key={skill}
            className={`inline-flex items-center gap-1.5 text-[13px] text-ink-3 bg-tag-fill border border-line-tag rounded-md py-[5px] ${
              editing ? "pl-2.5 pr-1.5" : "px-2.5"
            }`}
          >
            {skill}
            {editing && (
              <button
                onClick={() => change(profile.skills.filter((s) => s !== skill))}
                disabled={busy}
                aria-label={`Remove ${skill}`}
                className="border-0 bg-transparent p-0 leading-none text-muted-2 cursor-pointer hover:text-ink disabled:opacity-50"
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>

      {editing && (
        <div className="mt-3.5">
          <div className="flex gap-2">
            <TextInput
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Add a skill, then press Enter"
              aria-label="Add a skill"
              autoFocus
            />
            <Button variant="secondary" onClick={add} disabled={busy || !draft.trim()}>
              Add
            </Button>
          </div>
          {problem && (
            <p role="alert" className="m-0 mt-1.5 text-[12.5px] text-danger">
              {problem}
            </p>
          )}
        </div>
      )}
    </ProfileCard>
  );
}
