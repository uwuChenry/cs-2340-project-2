import type { ReactNode } from "react";

// Inline error / empty-state box for data that failed to load or came back empty.
export default function Notice({ tone = "neutral", children }: { tone?: "neutral" | "error"; children: ReactNode }) {
  const styles =
    tone === "error"
      ? "bg-danger-bg border-danger-border text-danger"
      : "bg-surface-sunken border-line text-muted";
  return (
    <div role={tone === "error" ? "alert" : undefined} className={`border rounded-xl px-4 py-3.5 text-[13.5px] leading-[1.5] ${styles}`}>
      {children}
    </div>
  );
}
