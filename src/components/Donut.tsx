"use client";

export default function Donut({
  pct,
  size = 64,
  stroke = 7,
  color = "#B98CE6",
  label,
  sub,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  sub?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="donut-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset .6s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <span className="absolute grid place-items-center text-center leading-none">
        <b className="num font-extrabold" style={{ fontSize: size * 0.26 }}>
          {pct}%
        </b>
        {label && <span className="text-[.6rem] text-(--color-mut) mt-0.5">{label}</span>}
        {sub && <span className="num text-[.55rem] text-(--color-mut)">{sub}</span>}
      </span>
    </span>
  );
}
