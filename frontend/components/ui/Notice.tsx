import type { ReactNode } from "react";

// Inline error / empty-state box for data that failed to load or came back empty.
export default function Notice({ tone = "neutral", children }: { tone?: "neutral" | "error"; children: ReactNode }) {
  const styles =
    tone === "error"
      ? "bg-danger-bg text-danger shadow-[0_3px_0_var(--color-danger-border)]"
      : "bg-paper text-muted shadow-[0_3px_0_var(--color-edge)]";
  return (
    <div role={tone === "error" ? "alert" : undefined} className={`rounded-[18px] px-4 py-3.5 text-[14px] font-bold leading-[1.5] ${styles}`}>
      {children}
    </div>
  );
}
