import { STAGES } from "@/lib/types";

export default function ProgressRail({ stageIndex }: { stageIndex: number }) {
  return (
    <div className="flex items-center flex-[2_1_280px] min-w-0">
      {STAGES.map((label, i) => {
        const isFinal = i === 4;
        const reached = i <= stageIndex;
        const isClosedFinal = stageIndex === 4 && isFinal;
        const dotColor = reached ? (isClosedFinal ? "#8A867C" : "#1B4DFF") : "#FFFFFF";
        const ringColor = reached ? (isClosedFinal ? "#8A867C" : "#1B4DFF") : "#DDD9D1";
        const barColor = i < stageIndex ? "#1B4DFF" : "#E6E3DC";
        const labelColor = reached ? "#4F4C45" : "#A3A096";
        return (
          <div key={label} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-[5px] shrink-0">
              <span
                className="block w-[11px] h-[11px] rounded-full"
                style={{ background: dotColor, border: `2px solid ${ringColor}` }}
              />
              <span className="text-[10.5px] whitespace-nowrap" style={{ color: labelColor }}>
                {label}
              </span>
            </div>
            <div className="flex-1 h-0.5 mx-0.5 mb-4" style={{ background: barColor }} />
          </div>
        );
      })}
    </div>
  );
}
