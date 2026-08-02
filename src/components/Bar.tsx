"use client";
export default function Bar({ pct, color = "#B98CE6", h = 6 }: { pct: number; color?: string; h?: number }) {
  return (
    <span className="block w-full rounded-full bg-white/8 overflow-hidden" style={{ height: h }}>
      <span
        className="block h-full rounded-full"
        style={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          background: `linear-gradient(90deg, ${color}, ${color}aa)`,
          transition: "width .6s cubic-bezier(.22,1,.36,1)",
        }}
      />
    </span>
  );
}
