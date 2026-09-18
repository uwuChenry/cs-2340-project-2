"use client";

import { useAppState } from "@/state/AppState";

export default function Toast() {
  const { toast } = useAppState();
  if (!toast) return null;
  return (
    <div className="fixed left-1/2 bottom-[26px] -translate-x-1/2 z-[80] bg-ink text-ground px-[18px] py-[11px] rounded-[10px] text-[13.5px] shadow-[0_8px_24px_rgba(26,25,23,0.22)]">
      {toast}
    </div>
  );
}
