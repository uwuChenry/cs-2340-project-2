"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ApiRole, ApiSessionUser } from "@/lib/apiTypes";
import { initialsOf } from "@/state/AuthState";
import { Avatar } from "./ui/Avatar";

const roleLabels: Record<ApiRole, string> = {
  job_seeker: "Job seeker",
  recruiter: "Recruiter",
  admin: "Administrator",
};

const itemClass =
  "block w-full text-left px-3.5 py-2 text-[13.5px] text-ink no-underline hover:no-underline hover:bg-hover-fill focus:bg-hover-fill focus:outline-none cursor-pointer border-0 bg-transparent";

/**
 * The avatar in the corner of the navbar, and the menu it opens: who you are and
 * what kind of account it is, then view profile, account settings and sign out.
 */
export default function UserMenu({ user, onSignOut }: { user: ApiSessionUser; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const profileHref = user.role === "recruiter" ? "/recruiter/profile" : user.role === "job_seeker" ? "/profile" : null;
  const adminHref = user.role === "admin" ? "/admin" : null;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Move focus into the menu when it opens so it can be driven from the keyboard.
  useEffect(() => {
    if (open) menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  function onMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
    items[next]?.focus();
  }

  const close = () => setOpen(false);

  return (
    <div ref={wrapper} className="relative">
      <button
        ref={trigger}
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="block rounded-full border-0 bg-transparent p-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Avatar initials={initialsOf(user.name)} src={user.photoUrl} size={34} />
      </button>

      {open && (
        <div
          ref={menu}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[240px] overflow-hidden rounded-xl border border-line bg-surface shadow-[0_12px_32px_rgba(26,25,23,0.14)]"
        >
          <div className="px-3.5 py-3 border-b border-line-soft">
            <div className="text-[14px] font-semibold tracking-[-0.01em] whitespace-nowrap overflow-hidden text-ellipsis">
              {user.name}
            </div>
            <div className="mt-0.5 text-[12.5px] text-muted-2">{user.role ? roleLabels[user.role] : "Account"}</div>
          </div>

          <div className="py-1.5">
            {adminHref && (
              <Link href={adminHref} role="menuitem" onClick={close} className={itemClass}>
                Admin dashboard
              </Link>
            )}
            {profileHref && (
              <Link href={profileHref} role="menuitem" onClick={close} className={itemClass}>
                View profile
              </Link>
            )}
            <Link href="/account" role="menuitem" onClick={close} className={itemClass}>
              Account settings
            </Link>
          </div>

          <div className="py-1.5 border-t border-line-soft">
            <button
              role="menuitem"
              onClick={() => {
                close();
                onSignOut();
              }}
              className={itemClass}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
