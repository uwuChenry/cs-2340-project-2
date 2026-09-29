"use client";

import { useMemo, useState } from "react";
import { ApiError, http, messageOf } from "@/lib/api";
import type { ApiSessionUser } from "@/lib/apiTypes";
import { useAsync } from "@/lib/useAsync";
import Guard from "@/components/Guard";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { FieldError, Label, Select, TextInput } from "@/components/ui/Field";
import Notice from "@/components/ui/Notice";
import { useAuth } from "@/state/AuthState";

type AdminUserRow = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "job_seeker" | "recruiter" | "admin" | null;
};

type AdminJobRow = {
  id: number;
  title: string;
  company: string;
  status: "draft" | "published" | "closed";
  city: string;
  state: string;
  posted_at: string;
};

export default function AdminPage() {
  return (
    <Guard role="admin">
      <AdminDashboard />
    </Guard>
  );
}

function AdminDashboard() {
  const { user } = useAuth();
  const [userRoleDrafts, setUserRoleDrafts] = useState<Record<number, string>>({});
  const [userError, setUserError] = useState<string | null>(null);
  const [jobReason, setJobReason] = useState<Record<number, string>>({});
  const [jobError, setJobError] = useState<string | null>(null);

  const users = useAsync(() => http.get<AdminUserRow[]>("/api/admin/users/"), []);
  const jobs = useAsync(() => http.get<AdminJobRow[]>("/api/admin/jobs/"), []);

  const adminName = useMemo(() => user?.name ?? "Administrator", [user]);

  async function updateUserRole(userId: number) {
    const role = userRoleDrafts[userId];
    if (!role) return;
    try {
      setUserError(null);
      await http.patch(`/api/admin/users/${userId}/`, { role });
      await users.reload();
    } catch (err) {
      setUserError(messageOf(err));
    }
  }

  async function moderateJob(jobId: number, status: "closed" | "published" | "draft") {
    const reason = (jobReason[jobId] ?? "").trim();
    try {
      setJobError(null);
      await http.patch(`/api/admin/jobs/${jobId}/moderate/`, { status, reason });
      await jobs.reload();
      setJobReason((current) => ({ ...current, [jobId]: "" }));
    } catch (err) {
      setJobError(messageOf(err));
    }
  }

  if (users.error || jobs.error) {
    return <Notice tone="error">{users.error ?? jobs.error}</Notice>;
  }

  const loadedUsers = users.data ?? [];
  const loadedJobs = jobs.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-2 mb-2">Admin</div>
        <h1 className="m-0 text-[30px] font-semibold tracking-[-0.025em]">Moderator dashboard</h1>
        <p className="mt-2 mb-0 text-[14px] text-muted">Signed in as {adminName}. Review accounts and existing roles.</p>
      </div>

      <Card>
        <h2 className="m-0 mb-3 text-[18px] font-semibold tracking-[-0.02em]">Users and roles</h2>
        {users.loading && <p className="text-[14px] text-muted">Loading users…</p>}
        {userError && <Notice tone="error">{userError}</Notice>}
        {!users.loading && loadedUsers.length === 0 && <p className="text-[14px] text-muted">No users found.</p>}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-line">
                <th className="py-2 pr-3 font-medium text-muted">User</th>
                <th className="py-2 pr-3 font-medium text-muted">Role</th>
                <th className="py-2 font-medium text-muted">Update</th>
              </tr>
            </thead>
            <tbody>
              {loadedUsers.map((member) => (
                <tr key={member.id} className="border-b border-line-soft align-middle">
                  <td className="py-3 pr-3">
                    <div className="font-medium">{member.first_name || member.username} {member.last_name}</div>
                    <div className="text-[12.5px] text-muted-2">{member.email || member.username}</div>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="inline-flex rounded-full bg-surface-tint border border-line px-2 py-1 text-[12px]">
                      {member.role ?? "none"}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2 items-center">
                      <Select
                        value={userRoleDrafts[member.id] ?? member.role ?? "job_seeker"}
                        onChange={(e) => setUserRoleDrafts((current) => ({ ...current, [member.id]: e.target.value }))}
                        className="max-w-[180px]"
                      >
                        <option value="job_seeker">Job seeker</option>
                        <option value="recruiter">Recruiter</option>
                        <option value="admin">Administrator</option>
                      </Select>
                      <Button variant="primary" size="sm" onClick={() => updateUserRole(member.id)}>
                        Save
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="m-0 mb-3 text-[18px] font-semibold tracking-[-0.02em]">Job moderation</h2>
        {jobs.loading && <p className="text-[14px] text-muted">Loading job posts…</p>}
        {jobError && <Notice tone="error">{jobError}</Notice>}
        {!jobs.loading && loadedJobs.length === 0 && <p className="text-[14px] text-muted">No jobs to review.</p>}

        <div className="space-y-3">
          {loadedJobs.map((job) => (
            <div key={job.id} className="border border-line rounded-lg p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{job.title}</div>
                  <div className="text-[13px] text-muted">{job.company} · {job.city}, {job.state}</div>
                </div>
                <div className="text-[12px] rounded-full border border-line bg-surface-tint px-2 py-1">
                  {job.status}
                </div>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <TextInput
                  placeholder="Moderation reason"
                  value={jobReason[job.id] ?? ""}
                  onChange={(e) => setJobReason((current) => ({ ...current, [job.id]: e.target.value }))}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => moderateJob(job.id, "closed")}>
                  Close post
                </Button>
                <Button variant="secondary" size="sm" onClick={() => moderateJob(job.id, "published")}>
                  Reopen
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
