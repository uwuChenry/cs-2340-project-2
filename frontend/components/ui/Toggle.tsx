"use client";

import { motion } from "motion/react";

// A 46×28 track with a white knob that sits on its own little drop edge. The
// knob springs across (a layout animation).
export default function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`flex shrink-0 w-[46px] h-7 rounded-full p-[3px] shadow-[inset_0_2px_0_rgba(0,0,0,0.12)] transition-colors duration-150 ${
        on ? "bg-accent justify-end" : "bg-line-strong justify-start"
      }`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 700, damping: 30 }}
        className="w-[22px] h-[22px] rounded-full bg-white shadow-[0_2px_0_rgba(0,0,0,0.18)]"
      />
    </span>
  );
}
