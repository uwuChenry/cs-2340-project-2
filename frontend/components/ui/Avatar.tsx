"use client";

import { useState } from "react";

type AvatarProps = {
  initials: string;
  size?: number;
  radius?: "circle" | "square";
  fontSize?: number;
  // A profile photo. Falls back to the initials if it is missing or fails to load.
  src?: string | null;
};

export function Avatar({ initials, size = 32, radius = "circle", fontSize, src }: AvatarProps) {
  // Remember which URL failed, so a new upload (a new URL) gets a fresh attempt.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const borderRadius = radius === "circle" ? "50%" : Math.max(6, Math.round(size / 4.5));

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
        className="shrink-0 object-cover border border-accent-border-3"
        style={{ width: size, height: size, borderRadius }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center shrink-0 bg-accent-tint-3 border border-accent-border-3 text-accent font-semibold"
      style={{
        width: size,
        height: size,
        borderRadius,
        fontSize: fontSize ?? Math.max(10, Math.round(size * 0.37)),
      }}
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

export function CompanyMark({ mark, bg, size = 26 }: CompanyMarkProps) {
  return (
    <div
      className="flex items-center justify-center shrink-0 text-white font-semibold"
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(6, Math.round(size / 3.7)),
        background: bg,
        fontSize: Math.max(9, Math.round(size * 0.42)),
      }}
    >
      {mark}
    </div>
  );
}
