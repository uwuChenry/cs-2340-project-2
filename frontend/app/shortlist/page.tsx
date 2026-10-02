"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { salaryLabel, setupLabel } from "@/lib/derive";
import { springBouncy, springSoft } from "@/lib/motion";
import { useAppState } from "@/state/AppState";
import Guard from "@/components/Guard";
import { CompanyMark } from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageHeading from "@/components/ui/PageHeading";

type CompareCell = { text: string; strong?: boolean };

export default function ShortlistPage() {
  return (
    <Guard role="job_seeker">
      <Shortlist />
    </Guard>
  );
}

function Shortlist() {
  const router = useRouter();
  const { shortlist: cartItems, seekerReady, toggleCart, clearCart, applyAll } = useAppState();

  const isEmpty = cartItems.length === 0;

  const rows: { label: string; cells: CompareCell[] }[] = [
    { label: "Pay", cells: cartItems.map((c) => ({ text: salaryLabel(c), strong: true })) },
    { label: "Location", cells: cartItems.map((c) => ({ text: c.location })) },
    { label: "Work setup", cells: cartItems.map((c) => ({ text: setupLabel(c) })) },
    {
      label: "Distance",
      cells: cartItems.map((c) => ({
        text: c.distanceMi === 0 ? "Work from anywhere" : c.distanceMi === null ? "Distance unknown" : `${c.distanceMi} mi from home`,
      })),
    },
    { label: "Visa sponsorship", cells: cartItems.map((c) => ({ text: c.visa ? "Yes" : "No" })) },
    { label: "Skill match", cells: cartItems.map((c) => ({ text: `${c.matchPct}% match`, strong: true })) },
    { label: "Posted", cells: cartItems.map((c) => ({ text: c.posted })) },
  ];

  return (
    <div>
      <PageHeading
        tag="Your pockets"
        title="Compare before you apply"
        sub={
          seekerReady
            ? `${cartItems.length} ${cartItems.length === 1 ? "posting" : "postings"} tucked away. Look at them side by side, then send them all off at once.`
            : undefined
        }
        className="mb-[22px]"
      />

      {!seekerReady ? (
        <p className="text-[15px] font-bold text-area-ink-2">Turning out your pockets…</p>
      ) : isEmpty ? (
        <Card padding="none" className="p-12 text-center">
          <motion.p
            initial={{ opacity: 0, scale: 0.8, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={springBouncy}
            className="m-0 mb-4 font-display text-[20px] font-semibold text-ink"
          >
            Your pockets are empty!
          </motion.p>
          <Button variant="primary" size="md" onClick={() => router.push("/search")}>
            Go to the board
          </Button>
        </Card>
      ) : (
        <div>
          <Card padding="none" className="overflow-x-auto">
            <div className="grid min-w-full" style={{ gridTemplateColumns: `160px repeat(${cartItems.length}, minmax(210px, 1fr))` }}>
              <div className="px-[18px] py-5 border-b-2 border-dashed border-line" />
              {cartItems.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springSoft, delay: i * 0.06 }}
                  className="px-[18px] py-5 border-b-2 border-dashed border-line border-l-2 border-l-line-soft"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CompanyMark mark={c.mark} bg={c.logoBg} size={28} />
                    <span className="text-[13px] font-extrabold text-muted">{c.company}</span>
                  </div>
                  <div className="font-display text-[18px] font-semibold leading-[1.25] text-ink">{c.title}</div>
                  <Button variant="link" className="mt-2.5" onClick={() => toggleCart(c)}>
                    Take out
                  </Button>
                </motion.div>
              ))}

              {rows.map((row) => (
                <div key={row.label} className="contents">
                  <div className="px-[18px] py-[13px] border-b-2 border-line-soft text-[13px] font-extrabold text-muted">{row.label}</div>
                  {row.cells.map((cell, i) => (
                    <div
                      key={i}
                      className={`px-[18px] py-[13px] border-b-2 border-line-soft border-l-2 border-l-line-soft text-[14.5px] ${
                        cell.strong ? "font-extrabold text-ink" : "font-semibold text-ink-3"
                      }`}
                    >
                      {cell.text}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Card>
          <div className="flex flex-wrap justify-end gap-2.5 mt-5">
            <Button variant="paper" size="md" onClick={clearCart}>
              Empty pockets
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={async () => {
                if (await applyAll(cartItems.map((c) => c.id))) router.push("/applications");
              }}
            >
              Send all {cartItems.length} {cartItems.length === 1 ? "application" : "applications"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
