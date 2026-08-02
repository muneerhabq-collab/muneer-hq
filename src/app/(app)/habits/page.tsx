"use client";

import { useMemo } from "react";
import { Repeat, Flame, Plus } from "lucide-react";
import { useStore } from "@/components/Store";
import Empty from "@/components/Empty";
import Bar from "@/components/Bar";
import { flatten } from "@/lib/tree";
import { todayISO, addDays, weekStart } from "@/lib/dates";

const DOW = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];

export default function Habits() {
  const { allTree, areas, habitLogs, toggleHabit, addNode, say } = useStore();
  const t = todayISO();

  const habits = useMemo(
    () => flatten(allTree).filter((n) => n.kind === "habit" && n.status !== "dropped"),
    [allTree]
  );

  const last30 = Array.from({ length: 30 }, (_, i) => addDays(t, -(29 - i)));
  const wStart = weekStart(t);
  const wDays = Array.from({ length: 7 }, (_, i) => addDays(wStart, i));

  const doneOn = (id: string, d: string) => habitLogs.some((l) => l.node_id === id && l.log_date === d);

  const streak = (id: string) => {
    let s = 0;
    for (let i = 0; i < 400; i++) {
      const d = addDays(t, -i);
      if (doneOn(id, d)) s++;
      else if (i > 0) break;
      else continue;
    }
    return s;
  };

  const addHabit = async () => {
    const a = areas[0];
    await addNode({ title: "عادة جديدة", kind: "habit", recurrence: "daily", area_id: a?.id ?? null, target_per_week: 7 });
    say("انضافت عادة. عدّل اسمها من صفحة الجانب.");
  };

  if (!habits.length)
    return (
      <Empty
        title="ما فيه عادات بعد"
        sub="العادة هي اللي تبني النتيجة. ضيف عادة يومية زي الرياضة او القراءة."
        action={
          <button onClick={addHabit} className="mt-2 rounded-xl bg-(--color-accent) px-4 py-2 text-sm font-bold text-[#1F0F25]">
            اضف عادة
          </button>
        }
      />
    );

  return (
    <div className="flex flex-col gap-4">
      <header className="rise flex items-center gap-3">
        <h1 className="flex items-center gap-2 text-xl font-extrabold">
          <Repeat size={20} className="text-(--color-mint)" /> العادات
        </h1>
        <button onClick={addHabit} className="mr-auto flex items-center gap-1.5 rounded-xl border border-white/12 px-3 py-2 text-xs hover:bg-white/8">
          <Plus size={14} /> عادة
        </button>
      </header>

      <div className="flex flex-col gap-3">
        {habits.map((h) => {
          const a = areas.find((x) => x.id === h.area_id);
          const color = a?.color ?? "#5EC5C0";
          const st = streak(h.id);
          const wDone = wDays.filter((d) => doneOn(h.id, d)).length;
          const target = h.target_per_week ?? 7;
          return (
            <div key={h.id} className="rise card p-4">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => toggleHabit(h.id)}
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 text-sm font-bold transition ${
                    doneOn(h.id, t) ? "text-[#1F0F25]" : "text-(--color-mut)"
                  }`}
                  style={doneOn(h.id, t) ? { background: color, borderColor: color } : { borderColor: "rgba(255,255,255,.15)" }}
                >
                  {doneOn(h.id, t) ? "تم" : "اليوم"}
                </button>
                <div className="min-w-0 flex-1">
                  <b className="block truncate">{h.title}</b>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    {a && <span className="chip" style={{ borderColor: `${color}55`, color }}>{a.name}</span>}
                    <span className="chip"><Flame size={11} className="text-(--color-amber)" /> <span className="num">{st}</span> يوم متتالي</span>
                    <span className="chip">الاسبوع <span className="num">{wDone}/{target}</span></span>
                  </span>
                </div>
              </div>

              <div className="mb-2"><Bar pct={Math.min(100, Math.round((wDone / target) * 100))} color={color} h={5} /></div>

              <div className="hide-scroll flex gap-[3px] overflow-x-auto pb-1">
                {last30.map((d) => (
                  <button
                    key={d}
                    onClick={() => toggleHabit(h.id, d)}
                    title={d}
                    className="h-6 w-[13px] shrink-0 rounded-[4px] transition hover:scale-110"
                    style={{
                      background: doneOn(h.id, d) ? color : "rgba(255,255,255,.07)",
                      outline: d === t ? `1.5px solid ${color}` : "none",
                    }}
                  />
                ))}
              </div>

              <div className="mt-2 flex gap-[3px]">
                {wDays.map((d, i) => (
                  <span key={d} className="w-[13px] shrink-0 text-center text-[.6rem] text-(--color-mut)">{DOW[i]}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
