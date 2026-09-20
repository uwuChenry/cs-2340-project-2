export default function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`flex shrink-0 w-9 h-[21px] rounded-full p-[2px] transition-colors duration-150 ${on ? "bg-accent justify-end" : "bg-line-strong justify-start"}`}
    >
      <span className="w-[17px] h-[17px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)]" />
    </span>
  );
}
