"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, RefreshCw, Wand2 } from "lucide-react";
import { useStore } from "@/components/Store";
import TaskPanel from "@/components/TaskPanel";
import { flatten, findNode } from "@/lib/tree";
import { todayISO, weekStart, addDays, fmtShort, fmtDate } from "@/lib/dates";
import type { TreeNode } from "@/lib/types";

const DOW = ["السبت", "الاحد", "الاثنين", "الثلاثاء", "الاربعاء", "الخميس", "الجمعة"];

export default function WeekView() {
  const { allTree, areas, patchNode, say } = useStore();
  const [off, setOff] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState("");

  const t = todayISO();
  const start = addDays(weekStart(t), off * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  const leaves = useMemo(() => flatten(allTree).filter((n) => n.kids.length === 0), [allTree]);
  const byDay = useMemo(() => {
    const m = new Map<string, TreeNode[]>();
    for (const d of days) m.set(d, []);
    for (const n of leaves) {
      if (n.due_date && m.has(n.due_date)) m.get(n.due_date)!.push(n);
    }
    return m;
  }, [leaves, days.join()]);

  const areaOf = (n: TreeNode) => areas.find((a) => a.id === n.area_id);
  const openNode = open ? findNode(allTree, open) : null;

  const run = async (path: string, label: string) => {
    setBusy(label);
    try {
      const r = await fetch(path, { method: "POST" });
      const j = await r.json();
      say(j.ok ? j.message ?? "تم" : j.error ?? "تعذر التنفيذ");
    } catch { say("تعذر الاتصال"); }
    setBusy("");
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="rise card flex flex-wrap items-center gap-3 p-4">
        <h1 className="flex items-center gap-2 text-lg font-extrabold">
          <CalendarDays size={19} /> الاسبوع
        </h1>
        <div className="flex items-center gap-1">
          <button onClick={() => setOff((o) => o + 1)} className="rounded-lg border border-white/12 p-1.5 hover:bg-white/8">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setOff(0)} className="rounded-lg border border-white/12 px-3 py-1.5 text-xs hover:bg-white/8">
            هذا الاسبوع
          </button>
          <button onClick={() => setOff((o) => o - 1)} className="rounded-lg border border-white/12 p-1.5 hover:bg-white/8">
            <ChevronLeft size={16} />
          </button>
        </div>
        <span className="num text-xs text-(--color-mut)">
          <bdi>{fmtShort(start)}</bdi> - <bdi>{fmtDate(addDays(start, 6))}</bdi>
        </span>

        <div className="mr-auto flex flex-wrap gap-2">
          <button
            onClick={() => run("/api/calendar/sync", "sync")}
            disabled={!!busy}
            className="flex items-center gap-2 rounded-xl border border-white/12 px-3 py-2 text-xs hover:bg-white/8 disabled:opacity-50"
          >
            <RefreshCw size={14} className={busy === "sync" ? "animate-spin" : ""} /> زامن قوقل كالندر
          </button>
          <button
            onClick={() => run("/api/calendar/autoplan", "plan")}
            disabled={!!busy}
            className="flex items-center gap-2 rounded-xl border border-(--color-accent)/40 px-3 py-2 text-xs text-(--color-accent) hover:bg-(--color-accent)/12 disabled:opacity-50"
          >
            <Wand2 size={14} className={busy === "plan" ? "animate-spin" : ""} /> رتّب اسبوعي تلقائيا
          </button>
        </div>
      </header>

      <div className="grid gap-2.5 md:grid-cols-7">
        {days.map((d, i) => {
          const list = byDay.get(d) ?? [];
          const isToday = d === t;
          return (
            <div
              key={d}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/id");
                if (id) patchNode(id, { due_date: d });
              }}
              className={`min-h-[150px] rounded-2xl border p-2.5 transition ${
                isToday ? "border-(--color-accent)/60 bg-(--color-accent)/8" : "border-white/8 bg-white/3"
              }`}
            >
              <div className="mb-2 flex items-baseline gap-1.5 px-0.5">
                <b className="text-[.78rem]">{DOW[i]}</b>
                <span className="num text-[.68rem] text-(--color-mut)">{d.slice(8)}</span>
                {list.length > 0 && <span className="num mr-auto text-[.65rem] text-(--color-mut)">{list.length}</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                {list.map((n) => {
                  const a = areaOf(n);
                  return (
                    <button
                      key={n.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/id", n.id)}
                      onClick={() => setOpen(n.id)}
                      className={`rounded-xl border-r-2 bg-black/20 px-2 py-1.5 text-right text-[.75rem] leading-snug transition hover:bg-white/10 ${
                        n.status === "done" ? "opacity-50 line-through" : ""
                      }`}
                      style={{ borderColor: a?.color ?? "#B98CE6" }}
                    >
                      {n.title}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[.72rem] text-(--color-mut)">
        اسحب اي مهمة وحطها في يوم ثاني عشان تغير الديدلاين.
      </p>

      {openNode && (
        <TaskPanel
          node={openNode}
          roots={allTree}
          color={areaOf(openNode)?.color ?? "#B98CE6"}
          onClose={() => setOpen(null)}
          onOpen={(n) => setOpen(n.id)}
        />
      )}
    </div>
  );
}
