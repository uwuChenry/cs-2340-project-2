"use client";

import { useRouter } from "next/navigation";
import { distanceLabel, salaryLabel, setupLabel } from "@/lib/derive";
import { useAppState } from "@/state/AppState";
import Guard from "@/components/Guard";
import { CompanyMark } from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

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
    { label: "Base salary", cells: cartItems.map((c) => ({ text: salaryLabel(c), strong: true })) },
    { label: "Location", cells: cartItems.map((c) => ({ text: c.location })) },
    { label: "Work setup", cells: cartItems.map((c) => ({ text: setupLabel(c) })) },
    { label: "Distance", cells: cartItems.map((c) => ({ text: distanceLabel(c) })) },
    { label: "Visa sponsorship", cells: cartItems.map((c) => ({ text: c.visa ? "Yes" : "Not offered" })) },
    { label: "Skill match", cells: cartItems.map((c) => ({ text: `${c.matchPct}% match`, strong: true })) },
    { label: "Posted", cells: cartItems.map((c) => ({ text: c.posted })) },
  ];

  return (
    <div>
      <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-2 mb-2">Shortlist</div>
      <h1 className="m-0 mb-1.5 text-[30px] font-semibold tracking-[-0.025em]">Compare before you apply</h1>
      <p className="m-0 mb-[22px] text-[15px] text-muted max-w-[560px] leading-[1.55]">
        {cartItems.length} roles collected. Side-by-side on the things you said matter, then send applications in
        one pass.
      </p>

      {!seekerReady ? (
        <p className="text-[14px] text-muted">Loading your shortlist…</p>
      ) : isEmpty ? (
        <Card className="border-dashed border-line-strong text-center" padding="none">
          <div className="py-[46px] px-[46px]">
            <p className="m-0 mb-3.5 text-[15px] text-muted">Nothing saved yet.</p>
            <Button variant="primary" size="md" onClick={() => router.push("/search")}>
              Browse roles
            </Button>
          </div>
        </Card>
      ) : (
        <div>
          <div className="bg-surface border border-line rounded-xl overflow-x-auto">
            <div
              className="grid min-w-full"
              style={{ gridTemplateColumns: `150px repeat(${cartItems.length}, minmax(200px, 1fr))` }}
            >
              <div className="px-4 py-[18px] border-b border-line" />
              {cartItems.map((c) => (
                <div key={c.id} className="px-4 py-[18px] border-b border-line border-l border-line-soft">
                  <div className="flex items-center gap-2 mb-2">
                    <CompanyMark mark={c.mark} bg={c.logoBg} size={22} />
                    <span className="text-[12.5px] text-muted">{c.company}</span>
                  </div>
                  <div className="text-[15px] font-semibold tracking-[-0.01em] leading-[1.3]">{c.title}</div>
                  <button
                    onClick={() => toggleCart(c)}
                    className="mt-2.5 border-0 bg-transparent p-0 text-[12.5px] text-muted-2 underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ))}

              {rows.map((row) => (
                <div key={row.label} className="contents">
                  <div className="px-4 py-[13px] border-b border-line-soft text-[12.5px] text-muted">{row.label}</div>
                  {row.cells.map((cell, i) => (
                    <div
                      key={i}
                      className={`px-4 py-[13px] border-b border-line-soft border-l border-line-soft text-[13.5px] ${
                        cell.strong ? "font-semibold text-ink" : "font-normal text-ink-3"
                      }`}
                    >
                      {cell.text}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2.5 mt-4">
            <Button variant="secondary" size="md" onClick={clearCart}>
              Clear shortlist
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={async () => {
                if (await applyAll(cartItems.map((c) => c.id))) router.push("/applications");
              }}
            >
              Apply to all {cartItems.length}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
