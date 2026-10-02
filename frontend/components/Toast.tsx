"use client";

import { AnimatePresence, motion } from "motion/react";
import { springBouncy } from "@/lib/motion";
import { useAppState } from "@/state/AppState";
import { PipAvatar } from "./Pip";

// Toasts come from Pip: the avatar plus a white speech bubble, bottom centre.
// Pip hops up from the bottom edge and the bubble pops out of Pip's side; a new
// message while one is showing just swaps the bubble.
export default function Toast() {
  const { toast } = useAppState();
  return (
    <div role="status" className="fixed left-1/2 bottom-6 -translate-x-1/2 z-[80] max-w-[calc(100%-32px)] pointer-events-none">
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            className="flex items-end gap-2.5"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30, transition: { duration: 0.18 } }}
            transition={springBouncy}
          >
            <motion.span
              key={toast}
              initial={{ rotate: -12, y: 4 }}
              animate={{ rotate: 0, y: 0 }}
              transition={{ type: "spring", stiffness: 600, damping: 12 }}
            >
              <PipAvatar size={48} ring="#FFFFFF" />
            </motion.span>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={toast}
                initial={{ opacity: 0, scale: 0.6, x: -12 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
                transition={springBouncy}
                style={{ transformOrigin: "0% 100%" }}
                className="bg-white rounded-[20px] px-[18px] py-3 text-[15px] font-extrabold text-ink shadow-[0_5px_0_rgba(40,20,5,0.18)]"
              >
                {toast}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
