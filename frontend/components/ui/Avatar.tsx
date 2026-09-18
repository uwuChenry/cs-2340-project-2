type AvatarProps = {
  initials: string;
  size?: number;
  radius?: "circle" | "square";
  fontSize?: number;
};

export function Avatar({ initials, size = 32, radius = "circle", fontSize }: AvatarProps) {
  return (
    <div
      className="flex items-center justify-center shrink-0 bg-accent-tint-3 border border-accent-border-3 text-accent font-semibold"
      style={{
        width: size,
        height: size,
        borderRadius: radius === "circle" ? "50%" : Math.max(6, Math.round(size / 4.5)),
        fontSize: fontSize ?? Math.max(10, Math.round(size * 0.37)),
      }}
    >
      {initials}
    </div>
  );
}

type CompanyMarkProps = {
  mark: string;
  bg: string;
  size?: number;
};

export function CompanyMark({ mark, bg, size = 26 }: CompanyMarkProps) {
  return (
    <div
      className="flex items-center justify-center shrink-0 text-white font-semibold"
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(6, Math.round(size / 3.7)),
        background: bg,
        fontSize: Math.max(9, Math.round(size * 0.42)),
      }}
    >
      {mark}
    </div>
  );
}
