"use client";

import { useMemo, useState } from "react";
import { Sun, AlertTriangle, Inbox, Zap, ArrowLeftRight } from "lucide-react";
import { useStore } from "@/components/Store";
import TaskPanel from "@/components/TaskPanel";
import Donut from "@/components/Donut";
import Empty from "@/components/Empty";
import { flatten, findNode } from "@/lib/tree";
import { todayISO, relDue, addDays } from "@/lib/dates";
import type { TreeNode } from "@/lib/types";
import { CheckCircle2, Circle } from "lucide-react";

export default function Today() {
  const { allTree, areas, setStatus, patchNode, say } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const t = todayISO();

  const leaves = useMemo(() => flatten(allTree).filter((n) => n.kids.length === 0), [allTree]);
  const overdue = leaves.filter((n) => n.status !== "done" && n.due_date && n.due_date < t);
  const due = leaves.filter((n) => n.status !== "done" && n.due_date === t);
  const doing = leaves.filter((n) => n.status === "doing" && n.due_date !== t && !(n.due_date && n.due_date < t));
  const noDate = leaves.filter((n) => n.status !== "done" && !n.due_date && n.kind !== "habit").slice(0, 12);
  const doneToday = leaves.filter((n) => n.status === "done" && n.done_at?.slice(0, 10) === t);

  const target = overdue.length + due.length;
  const pct = target + doneToday.length ? Math.round((doneToday.length / (target + doneToday.length)) * 100) : 0;

  const rollover = async () => {
    for (const n of overdue) await patchNode(n.id, { due_date: t });
    say(`تم ترحيل ${overdue.length} مهمة لليوم`);
  };

  const openNode = open ? findNode(allTree, open) : null;
  const areaOf = (n: TreeNode) => areas.find((a) => a.id === n.area_id);

  return (
    <div className="flex flex-col gap-5">
      <header className="rise card flex flex-wrap items-center gap-5 p-5">
        <Donut pct={pct} size={82} stroke={8} color="#E0A75E" />
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-xl font-extrabold">
            <Sun size={20} className="text-(--color-amber)" /> اليوم
          </h1>
          <p className="mt-1 text-sm text-(--color-mut)">
            <b className="num text-(--color-txt)">{target}</b> مهمة على جدولك ·{" "}
            انجزت <b className="num text-(--color-txt)">{doneToday.length}</b>
          </p>
        </div>
        {overdue.length > 0 && (
          <button
            onClick={rollover}
            className="flex items-center gap-2 rounded-2xl border border-white/12 px-4 py-2.5 text-sm hover:bg-white/8"
          >
            <ArrowLeftRight size={16} /> رحّل المتأخرة لليوم
          </button>
        )}
      </header>

      <Group title="متأخرة" icon={AlertTriangle} tone="#FF8A9B" list={overdue} {...{ areaOf, setStatus, setOpen }} />
      <Group title="مستحقة اليوم" icon={Sun} tone="#E0A75E" list={due} {...{ areaOf, setStatus, setOpen }} />
      <Group title="شغال عليها" icon={Zap} tone="#B98CE6" list={doing} {...{ areaOf, setStatus, setOpen }} />
      <Group title="بدون تاريخ (اقترح لها يوم)" icon={Inbox} tone="#7C9CE0" list={noDate} {...{ areaOf, setStatus, setOpen }}
        extra={(n: TreeNode) => (
          <button
            onClick={(e) => { e.stopPropagation(); patchNode(n.id, { due_date: t }); }}
            className="chip hover:bg-white/10"
          >
            اليوم
          </button>
        )}
      />
      {doneToday.length > 0 && (
        <Group title="خلصتها اليوم" icon={CheckCircle2} tone="#6BCB77" list={doneToday} {...{ areaOf, setStatus, setOpen }} />
      )}

      {target === 0 && doing.length === 0 && (
        <Empty title="جدولك نظيف اليوم" sub="لا متأخرات ولا مستحقات. خذ مهمة من القائمة تحت او ارتاح." />
      )}

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

function Group({ title, icon: Icon, tone, list, areaOf, setStatus, setOpen, extra }: any) {
  if (!list.length) return null;
  return (
    <section className="rise">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold" style={{ color: tone }}>
        <Icon size={15} /> {title} <span className="num text-(--color-mut)">({list.length})</span>
      </h2>
      <div className="flex flex-col gap-1.5">
        {list.map((n: TreeNode) => {
          const a = areaOf(n);
          const done = n.status === "done";
          return (
            <div
              key={n.id}
              className={`card flex items-center gap-3 p-3 transition hover:bg-white/8 ${done ? "opacity-55" : ""}`}
            >
              <button onClick={() => setStatus(n.id, done ? "todo" : "done")} style={{ color: done ? a?.color : undefined }}>
                {done ? <CheckCircle2 size={19} /> : <Circle size={19} className="text-(--color-mut)" />}
              </button>
              <button onClick={() => setOpen(n.id)} className="min-w-0 flex-1 text-right">
                <span className={`block truncate text-[.92rem] ${done ? "line-through" : ""}`}>{n.title}</span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                  {a && (
                    <span className="chip" style={{ borderColor: `${a.color}55`, color: a.color }}>
                      {a.name}
                    </span>
                  )}
                  {n.due_date && <span className="chip"><span className="num">{relDue(n.due_date)}</span></span>}
                  {n.estimate_min ? <span className="chip"><span className="num">{n.estimate_min}</span>د</span> : null}
                </span>
              </button>
              {extra?.(n)}
            </div>
          );
        })}
      </div>
    </section>
  );
}
