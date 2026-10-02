"use client";

import type { MouseEvent, ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { springSlide } from "@/lib/motion";

type Props = {
  open: boolean;
  onClose: () => void;
  width?: number;
  children: ReactNode;
};

/**
 * Slides in from the right over a warm scrim; rounded on its left edge only.
 * Callers keep it mounted and flip `open`: AnimatePresence holds on to the last
 * content while the sheet slides back out.
 */
export default function Sheet({ open, onClose, width = 620, children }: Props) {
  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sheet"
          onClick={onClose}
          className="fixed inset-0 z-[60] bg-scrim flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2, delay: 0.05 } }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            onClick={stop}
            role="dialog"
            aria-modal="true"
            className="h-full bg-paper rounded-l-[30px] overflow-y-auto w-full shadow-[-6px_0_0_rgba(40,20,5,0.12)]"
            style={{ maxWidth: width }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
            transition={springSlide}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SheetCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ rotate: 90 }}
      transition={{ type: "spring", stiffness: 400, damping: 18 }}
      className="border-0 bg-tan shadow-[0_3px_0_#D9C59A] w-[38px] h-[38px] rounded-full font-display text-[20px] font-semibold leading-none cursor-pointer shrink-0 active:translate-y-[3px] active:shadow-none"
      aria-label="Close"
    >
      ×
    </motion.button>
  );
}
