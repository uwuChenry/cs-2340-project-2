"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { ApiError, http, messageOf } from "@/lib/api";
import type { ApiAccount } from "@/lib/apiTypes";
import { useAsync } from "@/lib/useAsync";
import { useAppState } from "@/state/AppState";
import { useAuth } from "@/state/AuthState";
import Guard from "@/components/Guard";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { FieldError, Label, TextInput } from "@/components/ui/Field";
import Notice from "@/components/ui/Notice";

export default function AccountPage() {
  return (
    <Guard>
      <Account />
    </Guard>
  );
}

function Account() {
  const { user, refresh } = useAuth();
  const { showToast } = useAppState();
  const { data: account, error, loading, setData } = useAsync(() => http.get<ApiAccount>("/api/auth/account/"), []);

  const [draft, setDraft] = useState<Partial<ApiAccount>>({});
  const [accountErrors, setAccountErrors] = useState<Record<string, string[]>>({});
  const [savingAccount, setSavingAccount] = useState(false);

  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string[]>>({});
  const [savingPassword, setSavingPassword] = useState(false);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!account) return loading ? <p className="text-[14px] text-muted">Loading your account…</p> : null;

  const value = (key: keyof ApiAccount) => draft[key] ?? account[key];
  const dirty = Object.keys(draft).length > 0;
  const profileHref = user?.role === "recruiter" ? "/recruiter/profile" : "/profile";

  async function saveAccount(e: FormEvent) {
    e.preventDefault();
    setSavingAccount(true);
    setAccountErrors({});
    try {
      const updated = await http.patch<ApiAccount>("/api/auth/account/", draft);
      setData(() => updated);
      setDraft({});
      showToast("Account updated");
      refresh().catch(() => {});
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setAccountErrors(err.fieldErrors);
      else showToast(messageOf(err));
    } finally {
      setSavingAccount(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (passwords.next !== passwords.confirm) {
      setPasswordErrors({ confirm: ["The new passwords don't match."] });
      return;
    }
    setSavingPassword(true);
    setPasswordErrors({});
    try {
      await http.post("/api/auth/password/", { currentPassword: passwords.current, newPassword: passwords.next });
      setPasswords({ current: "", next: "", confirm: "" });
      showToast("Password changed");
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setPasswordErrors(err.fieldErrors);
      else showToast(messageOf(err));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="max-w-[640px]">
      <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-2 mb-2">Account</div>
      <h1 className="m-0 mb-1.5 text-[30px] font-semibold tracking-[-0.025em]">Account settings</h1>
      <p className="m-0 mb-[22px] text-[14px] text-muted">
        How you sign in. Your public details live on your <Link href={profileHref}>profile</Link>.
      </p>

      <div className="flex flex-col gap-3.5">
        <Card padding="none" className="p-[22px]">
          <h2 className="m-0 mb-3.5 text-[15px] font-semibold">Sign-in details</h2>
          <form onSubmit={saveAccount} className="grid gap-4" noValidate>
            <div>
              <Label>Username</Label>
              <TextInput
                value={value("username")}
                onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
                autoComplete="username"
              />
              <FieldError messages={accountErrors.username} />
            </div>
            <div>
              <Label>Email</Label>
              <TextInput
                type="email"
                value={value("email")}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                autoComplete="email"
              />
              <FieldError messages={accountErrors.email} />
            </div>
            <div className="flex justify-end gap-2 border-t border-line-soft pt-4">
              {dirty && (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setDraft({});
                    setAccountErrors({});
                  }}
                  disabled={savingAccount}
                >
                  Discard
                </Button>
              )}
              <Button type="submit" variant="primary" size="md" disabled={!dirty || savingAccount}>
                {savingAccount ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </Card>

        <Card padding="none" className="p-[22px]">
          <h2 className="m-0 mb-3.5 text-[15px] font-semibold">Change password</h2>
          <form onSubmit={changePassword} className="grid gap-4" noValidate>
            <div>
              <Label>Current password</Label>
              <TextInput
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                autoComplete="current-password"
              />
              <FieldError messages={passwordErrors.currentPassword} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label>New password</Label>
                <TextInput
                  type="password"
                  value={passwords.next}
                  onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
                  autoComplete="new-password"
                />
                <FieldError messages={passwordErrors.newPassword} />
              </div>
              <div>
                <Label>Confirm new password</Label>
                <TextInput
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                  autoComplete="new-password"
                />
                <FieldError messages={passwordErrors.confirm} />
              </div>
            </div>
            <p className="m-0 -mt-2 text-[12px] text-muted-2">
              At least 8 characters, and not a common or all-numeric password. You&rsquo;ll stay signed in on this device.
            </p>
            <div className="flex justify-end border-t border-line-soft pt-4">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={savingPassword || !passwords.current || !passwords.next}
              >
                {savingPassword ? "Changing…" : "Change password"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
