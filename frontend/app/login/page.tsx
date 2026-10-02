"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { messageOf } from "@/lib/api";
import { useAuth } from "@/state/AuthState";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Label, TextInput } from "@/components/ui/Field";
import PageHeading from "@/components/ui/PageHeading";

export default function LoginPage() {
  const { login, error: sessionError } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = await login(username.trim(), password);
      // Return to wherever the visitor was headed, but only to a path on this
      // site, so a crafted ?next= cannot bounce someone to another origin.
      const next = new URLSearchParams(window.location.search).get("next");
      // The landing page and auth pages aren't a destination worth returning to;
      // everyone signing in from them should start on their own home.
      const returnable = next && next.startsWith("/") && !next.startsWith("//") && !["/", "/login", "/signup"].includes(next);
      const safeNext = returnable ? next : null;
      router.push(safeNext ?? (user.role === "recruiter" ? "/recruiter/pipeline" : "/search"));
    } catch (err) {
      setError(messageOf(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-[420px] mx-auto pt-8">
      <PageHeading tag="Welcome back" title="Sign in to Roster" className="mb-5" />

      <Card padding="none" className="p-[22px]">
        <form onSubmit={submit} className="grid gap-4">
          <div>
            <Label htmlFor="login-username">Username</Label>
            <TextInput
              id="login-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </div>
          <div>
            <Label htmlFor="login-password">Password</Label>
            <TextInput
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {(error || sessionError) && (
            <p role="alert" className="m-0 text-[13.5px] font-bold text-danger">
              {error ?? sessionError}
            </p>
          )}

          <Button type="submit" variant="primary" size="md" disabled={submitting} className="w-full">
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>

      <p className="mt-5 mb-0 text-[14.5px] font-bold text-area-ink-2">
        New in town? <Link href="/signup">Create an account</Link>
      </p>

      {process.env.NODE_ENV !== "production" && (
        <p className="mt-4 mb-0 text-[13px] font-semibold leading-[1.6] text-area-ink-2">
          Demo accounts from <code>manage.py seed_demo</code>: <strong>maya</strong> (job seeker) and{" "}
          <strong>rhodes</strong> (recruiter), both with password <code>demo12345</code>.
        </p>
      )}
    </div>
  );
}
