"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { springBouncy } from "@/lib/motion";
import type { ApiRole, ApiSessionUser } from "@/lib/apiTypes";
import { useAppState } from "@/state/AppState";
import { initialsOf } from "@/state/AuthState";
import { Avatar } from "./ui/Avatar";
import Toggle from "./ui/Toggle";

const roleLabels: Record<ApiRole, string> = {
  job_seeker: "Job seeker",
  recruiter: "Recruiter",
  admin: "Administrator",
};

const itemClass =
  "block w-full text-left px-4 py-2 text-[14px] font-bold text-ink-2 no-underline hover:no-underline hover:text-ink hover:bg-tan focus:bg-tan focus:outline-none cursor-pointer border-0 bg-transparent";

/**
 * The avatar in the corner of the navbar, and the menu it opens: who you are and
 * what kind of account it is, then view profile, account settings, whether Pip
 * shows tips, and sign out.
 */
export default function UserMenu({ user, onSignOut }: { user: ApiSessionUser; onSignOut: () => void }) {
  const { showGuide, setShowGuide } = useAppState();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  // Administrators have no profile page of their own.
  const profileHref = user.role === "recruiter" ? "/recruiter/profile" : user.role === "job_seeker" ? "/profile" : null;

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
        className="block rounded-full border-0 bg-transparent p-0 cursor-pointer"
      >
        <Avatar initials={initialsOf(user.name)} src={user.photoUrl} size={38} raised />
      </button>

      <AnimatePresence>
      {open && (
        <motion.div
          key="menu"
          ref={menu}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          // Unfolds from the avatar it hangs off.
          initial={{ opacity: 0, scale: 0.85, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -6, transition: { duration: 0.14 } }}
          transition={springBouncy}
          style={{ transformOrigin: "calc(100% - 19px) 0" }}
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-[260px] overflow-hidden rounded-[20px] bg-paper shadow-[0_5px_0_#D9C59A,0_14px_30px_rgba(60,35,15,0.16)]"
        >
          <div className="px-4 py-3 border-b-2 border-dashed border-line">
            <div className="font-display text-[16px] font-semibold text-ink whitespace-nowrap overflow-hidden text-ellipsis">
              {user.name}
            </div>
            <div className="mt-0.5 text-[12.5px] font-bold text-muted-2">{user.role ? roleLabels[user.role] : "Account"}</div>
          </div>

          <div className="py-1.5">
            {profileHref && (
              <Link href={profileHref} role="menuitem" onClick={close} className={itemClass}>
                View profile
              </Link>
            )}
            <Link href="/account" role="menuitem" onClick={close} className={itemClass}>
              Account settings
            </Link>
          </div>

          <div className="py-1.5 border-t-2 border-dashed border-line">
            <button
              role="menuitemcheckbox"
              aria-checked={showGuide}
              onClick={() => setShowGuide(!showGuide)}
              className={`${itemClass} flex items-center justify-between gap-3`}
            >
              <span>
                <span className="block">Pip&rsquo;s tips</span>
                <span className="block text-[12px] text-muted-2">Recommendations from the town clerk</span>
              </span>
              <Toggle on={showGuide} />
            </button>
          </div>

          <div className="py-1.5 border-t-2 border-dashed border-line">
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
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
