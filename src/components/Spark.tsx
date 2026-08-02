"use client";

export default function Spark({
  points, color = "#B98CE6", w = 520, h = 130, unit = "",
}: { points: Array<{ x: string; y: number }>; color?: string; w?: number; h?: number; unit?: string }) {
  if (points.length < 2)
    return <p className="py-8 text-center text-xs text-(--color-mut)">تحتاج قياسين على الاقل عشان يظهر الرسم</p>;

  const ys = points.map((p) => p.y);
  const min = Math.min(...ys), max = Math.max(...ys);
  const pad = (max - min) * 0.15 || 1;
  const lo = min - pad, hi = max + pad;
  const px = (i: number) => 6 + (i * (w - 12)) / (points.length - 1);
  const py = (y: number) => h - 18 - ((y - lo) / (hi - lo)) * (h - 32);

  const d = points.map((p, i) => `${i ? "L" : "M"}${px(i)},${py(p.y)}`).join(" ");
  const area = `${d} L${px(points.length - 1)},${h - 18} L${px(0)},${h - 18} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height: h }}>
      <defs>
        <linearGradient id={`sp${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sp${color.slice(1)})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={px(i)} cy={py(p.y)} r="2.6" fill={color} />
      ))}
      <text x={w - 6} y="12" textAnchor="end" fill="#B79FC4" fontSize="10" style={{ direction: "ltr" }}>
        {points.at(-1)!.y}{unit}
      </text>
    </svg>
  );
}
