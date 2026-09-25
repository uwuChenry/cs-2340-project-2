"use client";

import type { MouseEvent, ReactNode } from "react";
import { motion } from "motion/react";
import { spring } from "../motion";

type Props = {
  onClose: () => void;
  width?: number;
  children: ReactNode;
};

// Render inside <AnimatePresence> so the sheet can slide back out when it closes.
export default function Sheet({ onClose, width = 620, children }: Props) {
  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  return (
    <motion.div
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-scrim flex justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        onClick={stop}
        className="h-full bg-surface border-l border-line overflow-y-auto w-full"
        style={{ maxWidth: width }}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ ...spring, bounce: 0 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function SheetCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="border border-line bg-surface w-[30px] h-[30px] rounded-lg text-[15px] leading-none cursor-pointer shrink-0 transition-colors duration-150 hover:bg-hover-fill"
      aria-label="Close"
    >
      ×
    </button>
  );
}
