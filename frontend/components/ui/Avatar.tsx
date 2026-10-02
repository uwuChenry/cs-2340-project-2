"use client";

import { useState } from "react";

type AvatarProps = {
  initials: string;
  size?: number;
  fontSize?: number;
  // A profile photo. Falls back to the initials if it is missing or fails to load.
  src?: string | null;
  // Raised avatars (header, profile, candidate cards) sit on a drop edge.
  raised?: boolean;
};

// Round, with a white border: peach with brown initials, or the photo.
export function Avatar({ initials, size = 32, fontSize, src, raised = false }: AvatarProps) {
  // Remember which URL failed, so a new upload (a new URL) gets a fresh attempt.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const border = size >= 60 ? 4 : size >= 30 ? 3 : 2;
  const style = {
    width: size,
    height: size,
    borderWidth: border,
    boxShadow: raised ? "0 3px 0 var(--color-edge)" : undefined,
  };

  if (src && src !== failedSrc) {
    return (
      // A user upload that the API has already resized to 512px, so next/image's
      // optimiser (and the remotePatterns config it would need for a host that
      // changes between localhost and 127.0.0.1) adds nothing here.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        onError={() => setFailedSrc(src)}
        className="shrink-0 object-cover rounded-full border-solid border-white bg-peach"
        style={style}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center shrink-0 rounded-full border-solid border-white bg-peach text-peach-ink font-display font-semibold"
      style={{ ...style, fontSize: fontSize ?? Math.max(10, Math.round(size * 0.34)) }}
    >
      {initials}
    </div>
  );
}

type CompanyMarkProps = {
  mark: string;
  bg: string;
  size?: number;
};

export function CompanyMark({ mark, bg, size = 30 }: CompanyMarkProps) {
  return (
    <div
      className="flex items-center justify-center shrink-0 rounded-full text-white font-display font-semibold"
      style={{ width: size, height: size, background: bg, fontSize: Math.max(10, Math.round(size * 0.38)) }}
    >
      {mark}
    </div>
  );
}
