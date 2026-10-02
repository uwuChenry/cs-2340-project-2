"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { springBouncy } from "@/lib/motion";

/**
 * Pip, the town clerk: the guide character who offers recommendations and
 * speaks the toasts. Original art, drawn inline so it needs no asset pipeline.
 */
export function PipAvatar({ size = 56, ring = "#FFF8E1" }: { size?: number; ring?: string }) {
  return (
    <span
      aria-hidden
      className="shrink-0 rounded-full overflow-hidden bg-peach block"
      style={{
        width: size,
        height: size,
        border: `${size >= 52 ? 4 : 3}px solid ${ring}`,
        boxShadow: "0 4px 0 rgba(60,35,15,0.18)",
      }}
    >
      <svg viewBox="0 0 56 56" width="100%" height="100%">
        {/* leaf sprig */}
        <path d="M28 15 C 27 10, 29 7, 33 5 C 34 10, 32 13, 28 15 Z" fill="#3F8F24" />
        <path d="M28 15 C 27 12, 26 10, 24 9" stroke="#2E6B18" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        {/* ears */}
        <circle cx="14" cy="20" r="6" fill="#E9A66B" />
        <circle cx="42" cy="20" r="6" fill="#E9A66B" />
        <circle cx="14" cy="20" r="3" fill="#F7C79A" />
        <circle cx="42" cy="20" r="3" fill="#F7C79A" />
        {/* face */}
        <ellipse cx="28" cy="33" rx="18" ry="16" fill="#F7C79A" />
        <ellipse cx="28" cy="38" rx="9" ry="7" fill="#FFF1DE" />
        {/* eyes */}
        <circle cx="21" cy="30" r="2.6" fill="#3A2A1C" />
        <circle cx="35" cy="30" r="2.6" fill="#3A2A1C" />
        <circle cx="21.9" cy="29.1" r="0.9" fill="#FFFFFF" />
        <circle cx="35.9" cy="29.1" r="0.9" fill="#FFFFFF" />
        {/* cheeks */}
        <ellipse cx="15.5" cy="36" rx="3" ry="2" fill="#F08A6A" opacity="0.55" />
        <ellipse cx="40.5" cy="36" rx="3" ry="2" fill="#F08A6A" opacity="0.55" />
        {/* nose and smile */}
        <ellipse cx="28" cy="35" rx="1.9" ry="1.4" fill="#8A4B1C" />
        <path d="M24.5 38.2 Q 26.3 40.4 28 38.6 Q 29.7 40.4 31.5 38.2" stroke="#8A4B1C" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/** Pip next to a speech bubble with a rust "Pip · town clerk" name tag. */
export function PipBubble({ children, tone = "paper", className = "" }: { children: ReactNode; tone?: "paper" | "white"; className?: string }) {
  return (
    <div className={`flex gap-3 items-end pt-3 ${className}`}>
      {/* Pip hops in, then the bubble pops out of Pip's side. A wiggle on hover. */}
      <motion.span
        initial={{ opacity: 0, y: 16, rotate: -10 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        whileHover={{ rotate: [0, -10, 8, -4, 0], transition: { duration: 0.6 } }}
        transition={springBouncy}
        className="shrink-0"
      >
        <PipAvatar size={56} />
      </motion.span>
      <motion.div
        initial={{ opacity: 0, scale: 0.85, x: -10 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ ...springBouncy, delay: 0.08 }}
        style={{ transformOrigin: "0% 100%" }}
        className={`relative flex-1 min-w-0 rounded-[22px] px-5 pt-4 pb-3.5 shadow-[0_5px_0_var(--color-edge)] ${
          tone === "white" ? "bg-white" : "bg-paper"
        }`}
      >
        <span className="absolute -top-3 left-[18px] font-display text-[13px] font-semibold bg-rust text-white px-3 py-[3px] rounded-full">
          Pip · town clerk
        </span>
        <div className="text-[15.5px] font-bold leading-[1.5] text-ink-2">{children}</div>
      </motion.div>
    </div>
  );
}
