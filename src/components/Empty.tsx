"use client";
export default function Empty({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="card grid place-items-center gap-2 p-10 text-center">
      <p className="font-bold">{title}</p>
      {sub && <p className="max-w-[42ch] text-sm leading-relaxed text-(--color-mut)">{sub}</p>}
      {action}
    </div>
  );
}
