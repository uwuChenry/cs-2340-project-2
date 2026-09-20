"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, messageOf } from "@/lib/api";
import type { ApiRegisterBody } from "@/lib/apiTypes";
import { useAuth } from "@/state/AuthState";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { FieldError, Label, TextInput } from "@/components/ui/Field";

type Role = ApiRegisterBody["role"];

const roles: { id: Role; title: string; body: string }[] = [
  { id: "job_seeker", title: "I'm looking for work", body: "Build a profile, search roles and track applications." },
  { id: "recruiter", title: "I'm hiring", body: "Post roles, source candidates and run a pipeline." },
];

export default function SignupPage() {
  const { user, register } = useAuth();
  const router = useRouter();

  const [role, setRole] = useState<Role>("job_seeker");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    confirm: "",
    company: "",
    title: "",
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (form.password !== form.confirm) {
      setErrors({ confirm: ["The passwords don't match."] });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const created = await register({
        username: form.username.trim(),
        password: form.password,
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role,
        ...(role === "recruiter" ? { company: form.company.trim(), title: form.title.trim() } : {}),
      });
      // Land on the page where they fill in the rest of their profile.
      router.push(created.role === "recruiter" ? "/recruiter/profile" : "/profile");
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
      else setFormError(messageOf(err));
      setSubmitting(false);
    }
  }

  if (user) {
    return (
      <div className="max-w-[460px] mx-auto pt-8">
        <Card>
          <div className="text-[15px] font-semibold mb-1">You&rsquo;re already signed in</div>
          <p className="m-0 text-[13.5px] text-muted">
            Signed in as {user.name}. Sign out first if you want to create a different account, or{" "}
            <Link href={user.role === "recruiter" ? "/recruiter/pipeline" : "/search"}>carry on where you were</Link>.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[520px] mx-auto pt-8">
      <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-2 mb-2">Account</div>
      <h1 className="m-0 mb-5 text-[30px] font-semibold tracking-[-0.025em]">Create your account</h1>

      <form onSubmit={submit} noValidate>
        <fieldset className="border-0 p-0 m-0 mb-4">
          <legend className="p-0 mb-2 text-xs font-medium text-muted">I am…</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {roles.map((r) => {
              const selected = role === r.id;
              return (
                <label
                  key={r.id}
                  className={`block cursor-pointer rounded-xl border px-4 py-3.5 ${
                    selected ? "bg-accent-tint-2 border-accent" : "bg-surface border-line hover:border-line-hover"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.id}
                    checked={selected}
                    onChange={() => setRole(r.id)}
                    className="sr-only"
                  />
                  <span className={`block text-[14.5px] font-semibold mb-0.5 ${selected ? "text-accent-deep" : ""}`}>
                    {r.title}
                  </span>
                  <span className="block text-[12.5px] leading-[1.45] text-muted">{r.body}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <Card padding="none" className="p-[22px]">
          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label>First name</Label>
                <TextInput value={form.firstName} onChange={set("firstName")} autoComplete="given-name" required />
                <FieldError messages={errors.firstName} />
              </div>
              <div>
                <Label>Last name</Label>
                <TextInput value={form.lastName} onChange={set("lastName")} autoComplete="family-name" required />
                <FieldError messages={errors.lastName} />
              </div>
            </div>

            {role === "recruiter" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <Label>Company</Label>
                  <TextInput value={form.company} onChange={set("company")} placeholder="Where you're hiring" required />
                  <FieldError messages={errors.company} />
                </div>
                <div>
                  <Label>Your title (optional)</Label>
                  <TextInput value={form.title} onChange={set("title")} placeholder="e.g. Talent Partner" />
                  <FieldError messages={errors.title} />
                </div>
              </div>
            )}

            <div>
              <Label>Email</Label>
              <TextInput type="email" value={form.email} onChange={set("email")} autoComplete="email" required />
              <FieldError messages={errors.email} />
            </div>

            <div>
              <Label>Username</Label>
              <TextInput value={form.username} onChange={set("username")} autoComplete="username" required />
              <FieldError messages={errors.username} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label>Password</Label>
                <TextInput
                  type="password"
                  value={form.password}
                  onChange={set("password")}
                  autoComplete="new-password"
                  required
                />
                <FieldError messages={errors.password} />
              </div>
              <div>
                <Label>Confirm password</Label>
                <TextInput
                  type="password"
                  value={form.confirm}
                  onChange={set("confirm")}
                  autoComplete="new-password"
                  required
                />
                <FieldError messages={errors.confirm} />
              </div>
            </div>
            <p className="m-0 -mt-2 text-[12px] text-muted-2">At least 8 characters, and not a common or all-numeric password.</p>

            {formError && (
              <p role="alert" className="m-0 text-[13px] text-danger">
                {formError}
              </p>
            )}

            <Button type="submit" variant="primary" size="md" disabled={submitting} className="w-full !rounded-lg">
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </div>
        </Card>
      </form>

      <p className="mt-4 mb-0 text-[13.5px] text-muted">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
