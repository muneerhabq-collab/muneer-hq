"use client";

/** عجلة الحياة: كل جانب ضلع، والمساحة الملونة هي التوازن الحقيقي */
export default function LifeWheel({
  data, size = 300,
}: { data: Array<{ name: string; pct: number; color: string }>; size?: number }) {
  const n = data.length || 1;
  const cx = size / 2, cy = size / 2;
  const R = size / 2 - 42;
  const ang = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, r: number) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];

  const poly = data.map((d, i) => pt(i, (R * Math.max(4, d.pct)) / 100).join(",")).join(" ");
  const rings = [25, 50, 75, 100];

  return (
    <svg width={size} height={size} className="mx-auto block overflow-visible">
      <defs>
        <linearGradient id="wheelfill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B98CE6" stopOpacity=".55" />
          <stop offset="1" stopColor="#5EC5C0" stopOpacity=".35" />
        </linearGradient>
      </defs>

      {rings.map((r) => (
        <polygon
          key={r}
          points={data.map((_, i) => pt(i, (R * r) / 100).join(",")).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,.08)"
        />
      ))}
      {data.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,.08)" />;
      })}

      <polygon
        points={poly}
        fill="url(#wheelfill)"
        stroke="#B98CE6"
        strokeWidth="2"
        strokeLinejoin="round"
        style={{ transition: "all .6s cubic-bezier(.22,1,.36,1)" }}
      />

      {data.map((d, i) => {
        const [x, y] = pt(i, (R * Math.max(4, d.pct)) / 100);
        return <circle key={i} cx={x} cy={y} r="4" fill={d.color} stroke="#1F0F25" strokeWidth="1.5" />;
      })}

      {data.map((d, i) => {
        const [x, y] = pt(i, R + 24);
        return (
          <g key={i}>
            <text
              x={x} y={y - 3} textAnchor="middle"
              fill="#F3EAF8" fontSize="11.5" fontWeight="700"
            >
              {d.name}
            </text>
            <text
              x={x} y={y + 11} textAnchor="middle"
              fill={d.color} fontSize="11" fontWeight="800"
              style={{ direction: "ltr", unicodeBidi: "isolate" }}
            >
              {d.pct}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}
