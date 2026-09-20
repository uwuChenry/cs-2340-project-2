"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiError, http, messageOf } from "@/lib/api";
import type { ApiRecruiterProfile } from "@/lib/apiTypes";
import { useAsync } from "@/lib/useAsync";
import { useAppState } from "@/state/AppState";
import { useAuth } from "@/state/AuthState";
import Guard from "@/components/Guard";
import { Avatar, CompanyMark } from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { FieldError, Label, TextInput } from "@/components/ui/Field";
import Notice from "@/components/ui/Notice";

export default function RecruiterProfilePage() {
  return (
    <Guard role="recruiter">
      <RecruiterProfile />
    </Guard>
  );
}

type Fields = Pick<ApiRecruiterProfile, "firstName" | "lastName" | "email" | "title" | "companyWebsite">;

function RecruiterProfile() {
  const { showToast } = useAppState();
  const { refresh: refreshSession } = useAuth();
  const { data: profile, error, loading, setData } = useAsync(
    () => http.get<ApiRecruiterProfile>("/api/recruiter/profile/"),
    [],
  );

  const [draft, setDraft] = useState<Partial<Fields>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!profile) return loading ? <p className="text-[14px] text-muted">Loading your profile…</p> : null;

  const value = <K extends keyof Fields>(key: K): string => draft[key] ?? profile[key];
  const dirty = Object.keys(draft).length > 0;
  const set = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  async function save() {
    setSaving(true);
    setErrors({});
    try {
      const updated = await http.patch<ApiRecruiterProfile>("/api/recruiter/profile/", draft);
      setData(() => updated);
      setDraft({});
      showToast("Profile saved");
      // The header shows the name from the session.
      refreshSession().catch(() => {});
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
      else showToast(messageOf(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-2 mb-2">Account</div>
      <h1 className="m-0 mb-5 text-[30px] font-semibold tracking-[-0.025em]">Your profile</h1>

      <div className="flex flex-wrap gap-[18px] items-start">
        <Card padding="none" className="flex-[3_1_400px] min-w-0 p-[22px]">
          <div className="flex items-center gap-3.5 mb-5">
            <Avatar initials={profile.initials} size={56} radius="square" />
            <div className="min-w-0">
              <div className="text-[19px] font-semibold tracking-[-0.015em]">{profile.name}</div>
              <div className="text-[13.5px] text-muted">
                {[profile.title, profile.company].filter(Boolean).join(" · ")}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <Label>First name</Label>
              <TextInput value={value("firstName")} onChange={set("firstName")} />
              <FieldError messages={errors.firstName} />
            </div>
            <div>
              <Label>Last name</Label>
              <TextInput value={value("lastName")} onChange={set("lastName")} />
              <FieldError messages={errors.lastName} />
            </div>
            <div>
              <Label>Job title</Label>
              <TextInput value={value("title")} onChange={set("title")} placeholder="e.g. Talent Partner" />
              <FieldError messages={errors.title} />
            </div>
            <div>
              <Label>Email</Label>
              <TextInput type="email" value={value("email")} onChange={set("email")} />
              <FieldError messages={errors.email} />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-line-soft pt-4 mt-5">
            {dirty && (
              <Button variant="secondary" size="md" onClick={() => { setDraft({}); setErrors({}); }} disabled={saving}>
                Discard
              </Button>
            )}
            <Button variant="primary" size="md" onClick={save} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </Card>

        <div className="flex-[1_1_300px] min-w-0 max-w-[400px] flex flex-col gap-3.5">
          <Card padding="none" className="p-[18px]">
            <div className="flex items-center gap-2.5 mb-3">
              <CompanyMark mark={profile.companyMark} bg="#1A1917" size={30} />
              <div className="min-w-0">
                <div className="text-[15px] font-semibold">{profile.company}</div>
                <div className="text-xs text-muted-2">Shared by every recruiter at this company</div>
              </div>
            </div>
            <Label>Company website</Label>
            <TextInput
              type="url"
              value={value("companyWebsite")}
              onChange={set("companyWebsite")}
              placeholder="https://…"
            />
            <FieldError messages={errors.companyWebsite} />
            <p className="m-0 mt-3 text-[12.5px] leading-[1.5] text-muted-2">
              The company name was set when you signed up and can&rsquo;t be changed here, since it&rsquo;s the same name
              candidates see on every opening.
            </p>
          </Card>

          <Card padding="none" className="p-[18px]">
            <h2 className="m-0 mb-1.5 text-[15px] font-semibold">Next steps</h2>
            <ul className="m-0 p-0 list-none flex flex-col gap-2 text-[13.5px]">
              <li>
                <Link href="/recruiter/post">Post your first opening →</Link>
              </li>
              <li>
                <Link href="/recruiter/candidates">Search for candidates →</Link>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
