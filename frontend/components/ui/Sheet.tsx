import type { MouseEvent, ReactNode } from "react";

type Props = {
  onClose: () => void;
  width?: number;
  children: ReactNode;
};

export default function Sheet({ onClose, width = 620, children }: Props) {
  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-scrim flex justify-end"
    >
      <div
        onClick={stop}
        className="h-full bg-surface border-l border-line overflow-y-auto w-full"
        style={{ maxWidth: width }}
      >
        {children}
      </div>
    </div>
  );
}

export function SheetCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="border border-line bg-surface w-[30px] h-[30px] rounded-lg text-[15px] leading-none cursor-pointer shrink-0"
      aria-label="Close"
    >
      ×
    </button>
  );
}
