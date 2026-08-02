"use client";

import { useMemo, useState } from "react";
import { Trophy, Plus } from "lucide-react";
import { useStore } from "@/components/Store";
import { fmtDate, todayISO } from "@/lib/dates";
import Empty from "@/components/Empty";

export default function Archive() {
  const { achievements, areas, addAchievement } = useStore();
  const [t, setT] = useState("");
  const [area, setArea] = useState<string>("");

  const groups = useMemo(() => {
    const m = new Map<string, typeof achievements>();
    for (const a of achievements) {
      const k = a.happened_on.slice(0, 7);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(a);
    }
    return [...m.entries()].sort((x, y) => y[0].localeCompare(x[0]));
  }, [achievements]);

  const add = async () => {
    if (!t.trim()) return;
    await addAchievement({ title: t.trim(), area_id: area || null, happened_on: todayISO() });
    setT("");
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="flex items-center gap-2 text-xl font-extrabold">
        <Trophy size={20} className="text-(--color-amber)" /> الانجازات
      </h1>

      <section className="rise card flex flex-wrap gap-2 p-4">
        <input
          value={t}
          onChange={(e) => setT(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="سجّل انجاز..."
          className="min-w-[180px] flex-1 rounded-xl border border-white/12 bg-black/25 px-3 py-2 text-sm outline-none"
        />
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="rounded-xl border border-white/12 bg-black/25 px-3 py-2 text-sm outline-none"
        >
          <option value="">بدون جانب</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button onClick={add} className="rounded-xl bg-(--color-amber) px-4 py-2 text-sm font-bold text-[#1F0F25]">
          <Plus size={16} />
        </button>
      </section>

      {groups.length === 0 && (
        <Empty title="ما فيه انجازات مسجلة" sub="اي هدف او مشروع تخلصه ينضاف هنا تلقائيا." />
      )}

      {groups.map(([month, list]) => (
        <section key={month} className="rise">
          <h2 className="num mb-2 text-sm font-bold text-(--color-mut)">{month}</h2>
          <div className="relative flex flex-col gap-2 pr-4">
            <span className="tree-line" style={{ insetInlineStart: "6px" }} />
            {list.map((a) => {
              const ar = areas.find((x) => x.id === a.area_id);
              return (
                <div key={a.id} className="card relative p-3.5">
                  <span
                    className="absolute -right-[22px] top-5 h-2.5 w-2.5 rounded-full"
                    style={{ background: ar?.color ?? "#E0A75E" }}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-[.92rem]">{a.title}</b>
                    {ar && <span className="chip" style={{ borderColor: `${ar.color}55`, color: ar.color }}>{ar.name}</span>}
                    {a.source === "auto" && <span className="chip">تلقائي</span>}
                    <span className="num mr-auto text-[.7rem] text-(--color-mut)">{fmtDate(a.happened_on)}</span>
                  </div>
                  {a.note && <p className="mt-1.5 text-[.8rem] leading-relaxed text-(--color-mut)">{a.note}</p>}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
