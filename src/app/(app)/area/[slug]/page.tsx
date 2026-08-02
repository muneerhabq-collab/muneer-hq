"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, ListTree, Columns3, Filter } from "lucide-react";
import { useStore } from "@/components/Store";
import TaskTree from "@/components/TaskTree";
import TaskPanel from "@/components/TaskPanel";
import QuickAdd from "@/components/QuickAdd";
import Donut from "@/components/Donut";
import Bar from "@/components/Bar";
import Empty from "@/components/Empty";
import Board from "@/components/Board";
import { statsOf, findNode, flatten, stats } from "@/lib/tree";
import { todayISO, addDays, weekStart } from "@/lib/dates";
import type { TreeNode } from "@/lib/types";

const FILTERS = [
  { k: "all", t: "الكل" },
  { k: "today", t: "اليوم" },
  { k: "week", t: "هذا الاسبوع" },
  { k: "over", t: "متأخرة" },
  { k: "open", t: "غير منجزة" },
  { k: "done", t: "منجزة" },
];

export default function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const sp = useSearchParams();
  const { areas, tree, allTree } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [f, setF] = useState("all");
  const [view, setView] = useState<"tree" | "board">("tree");
  const [add, setAdd] = useState(false);

  const area = areas.find((a) => a.slug === slug);
  const roots = useMemo(() => (area ? tree.get(area.id) ?? [] : []), [area, tree]);
  const s = useMemo(() => statsOf(roots), [roots]);

  useEffect(() => {
    const n = sp.get("node");
    if (n) setOpen(n);
  }, [sp]);

  const t = todayISO();
  const wEnd = addDays(weekStart(t), 6);

  const match = useMemo(() => {
    const fn = (n: TreeNode): boolean => {
      if (f === "all") return true;
      if (f === "done") return n.status === "done";
      if (f === "open") return n.status !== "done";
      if (f === "today") return n.status !== "done" && !!n.due_date && n.due_date <= t;
      if (f === "week") return n.status !== "done" && !!n.due_date && n.due_date <= wEnd;
      if (f === "over") return n.status !== "done" && !!n.due_date && n.due_date < t;
      return true;
    };
    return fn;
  }, [f, t, wEnd]);

  const deepMatch = useMemo(() => {
    const dm = (n: TreeNode): boolean => match(n) || n.kids.some(dm);
    return dm;
  }, [match]);

  const shown = useMemo(() => roots.filter(deepMatch), [roots, deepMatch]);
  const openNode = open ? findNode(allTree, open) : null;

  if (!area) return <Empty title="ما لقيت هذا الجانب" />;

  return (
    <div className="flex flex-col gap-4">
      <header className="rise card flex flex-wrap items-center gap-4 p-5">
        <Donut pct={s.pct} size={86} stroke={9} color={area.color} />
        <div className="min-w-[220px] flex-1">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: area.color }} />
            <h1 className="text-xl font-extrabold">{area.name}</h1>
          </div>
          <p className="mt-1 text-sm text-(--color-mut)">
            <b className="num text-(--color-txt)">{s.done}</b> من{" "}
            <b className="num text-(--color-txt)">{s.total}</b> مهمة نهائية ·{" "}
            <span className="num">{roots.length}</span> هدف رئيسي
          </p>
          <div className="mt-3"><Bar pct={s.pct} color={area.color} h={7} /></div>
        </div>
        <button
          onClick={() => setAdd(true)}
          className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold text-[#1F0F25]"
          style={{ background: area.color }}
        >
          <Plus size={17} /> مهمة
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-(--color-mut)" />
        {FILTERS.map((x) => (
          <button
            key={x.k}
            onClick={() => setF(x.k)}
            className={`rounded-xl border px-3 py-1.5 text-xs transition ${
              f === x.k ? "border-transparent font-bold text-[#1F0F25]" : "border-white/12 text-(--color-mut) hover:bg-white/8"
            }`}
            style={f === x.k ? { background: area.color } : {}}
          >
            {x.t}
          </button>
        ))}
        <div className="mr-auto flex gap-1 rounded-xl border border-white/12 p-0.5">
          <button
            onClick={() => setView("tree")}
            className={`rounded-lg p-1.5 ${view === "tree" ? "bg-white/12" : "text-(--color-mut)"}`}
            title="شجرة"
          >
            <ListTree size={16} />
          </button>
          <button
            onClick={() => setView("board")}
            className={`rounded-lg p-1.5 ${view === "board" ? "bg-white/12" : "text-(--color-mut)"}`}
            title="لوحة"
          >
            <Columns3 size={16} />
          </button>
        </div>
      </div>

      {view === "tree" ? (
        shown.length ? (
          <TaskTree
            nodes={shown}
            color={area.color}
            onOpen={(n) => setOpen(n.id)}
            filter={match}
          />
        ) : (
          <Empty
            title="ما فيه مهام هنا"
            sub="جرب تغير الفلتر او ضيف مهمة جديدة."
            action={
              <button onClick={() => setAdd(true)} className="mt-2 rounded-xl bg-(--color-accent) px-4 py-2 text-sm font-bold text-[#1F0F25]">
                اضف مهمة
              </button>
            }
          />
        )
      ) : (
        <Board
          nodes={flatten(roots).filter((n) => n.kids.length === 0)}
          color={area.color}
          onOpen={(n) => setOpen(n.id)}
        />
      )}

      {openNode && (
        <TaskPanel
          node={openNode}
          roots={roots}
          color={area.color}
          onClose={() => setOpen(null)}
          onOpen={(n) => setOpen(n.id)}
        />
      )}
      {add && <QuickAdd onClose={() => setAdd(false)} defaultArea={area.id} />}
    </div>
  );
}
