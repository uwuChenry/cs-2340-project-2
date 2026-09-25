"use client";

import { AnimatePresence, motion } from "motion/react";
import { useAppState } from "@/state/AppState";
import { snappy } from "./motion";

export default function Toast() {
  const { toast } = useAppState();
  return (
    <div className="fixed inset-x-0 bottom-[26px] z-[80] flex justify-center pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toast && (
          <motion.div
            key={toast}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15 } }}
            transition={snappy}
            className="pointer-events-auto bg-ink text-ground px-[18px] py-[11px] rounded-[10px] text-[13.5px] shadow-[0_8px_24px_rgba(26,25,23,0.22)]"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
