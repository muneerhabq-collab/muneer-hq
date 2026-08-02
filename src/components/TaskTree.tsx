"use client";

import { useState } from "react";
import {
  ChevronDown, ChevronLeft, Plus, GripVertical, Circle, CheckCircle2,
  CircleDot, Ban, Flag, Timer,
} from "lucide-react";
import type { TreeNode } from "@/lib/types";
import { stats, isLeaf } from "@/lib/tree";
import { relDue, dueClass } from "@/lib/dates";
import { useStore } from "./Store";
import Bar from "./Bar";
import Donut from "./Donut";

const STATUS_ICON = {
  todo: Circle,
  doing: CircleDot,
  done: CheckCircle2,
  blocked: Ban,
  dropped: Ban,
} as const;

export default function TaskTree({
  nodes,
  color,
  onOpen,
  depth = 0,
  filter,
}: {
  nodes: TreeNode[];
  color: string;
  onOpen: (n: TreeNode) => void;
  depth?: number;
  filter?: (n: TreeNode) => boolean;
}) {
  return (
    <div className={depth === 0 ? "flex flex-col gap-2.5" : "relative flex flex-col gap-1.5 pr-4 mt-1.5"}>
      {depth > 0 && <span className="tree-line" style={{ insetInlineStart: "8px" }} />}
      {nodes.map((n) => (
        <Row key={n.id} n={n} color={color} depth={depth} onOpen={onOpen} filter={filter} />
      ))}
    </div>
  );
}

function Row({
  n, color, depth, onOpen, filter,
}: { n: TreeNode; color: string; depth: number; onOpen: (n: TreeNode) => void; filter?: (n: TreeNode) => boolean }) {
  const { setStatus, addNode, moveNode, patchNode } = useStore();
  const [open, setOpen] = useState(depth < 1);
  const [drag, setDrag] = useState<"" | "over" | "in">("");
  const s = stats(n);
  const leaf = isLeaf(n);
  const done = n.status === "done";
  const kids = n.kids.filter((k) => (filter ? filter(k) || k.kids.length > 0 : true));
  const Icon = STATUS_ICON[n.status] ?? Circle;
  const dc = dueClass(n.due_date, done);

  const toggle = () => setStatus(n.id, done ? "todo" : "done");

  const addChild = async () => {
    await addNode({
      title: "مهمة فرعية",
      area_id: n.area_id,
      parent_id: n.id,
      kind: "task",
      sort: (n.kids.at(-1)?.sort ?? 0) + 10,
    });
    setOpen(true);
  };

  const top = depth === 0;

  return (
    <div
      draggable
      onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData("text/id", n.id); }}
      onDragOver={(e) => {
        e.preventDefault(); e.stopPropagation();
        const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDrag(e.clientY - box.top < box.height * 0.6 ? "over" : "in");
      }}
      onDragLeave={() => setDrag("")}
      onDrop={async (e) => {
        e.preventDefault(); e.stopPropagation();
        const id = e.dataTransfer.getData("text/id");
        setDrag("");
        if (!id || id === n.id) return;
        if (drag === "in") {
          await moveNode(id, n.id, n.area_id, (n.kids.at(-1)?.sort ?? 0) + 10);
          setOpen(true);
        } else {
          await moveNode(id, n.parent_id, n.area_id, (n.sort ?? 0) - 5);
        }
      }}
      className={`group relative rounded-2xl transition ${
        top ? "card p-3.5" : "border border-white/7 bg-white/3 p-2.5"
      } ${drag === "in" ? "ring-2 ring-(--color-accent)/70" : ""} ${
        drag === "over" ? "border-t-2 border-t-(--color-accent)" : ""
      } ${done ? "opacity-55" : ""}`}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 cursor-grab text-(--color-mut)/50 opacity-0 transition group-hover:opacity-100">
          <GripVertical size={15} />
        </span>

        <button
          onClick={toggle}
          title={done ? "ارجاع" : "انجاز"}
          className="mt-0.5 shrink-0 transition hover:scale-110"
          style={{ color: done ? color : undefined }}
        >
          <Icon size={top ? 21 : 18} className={done ? "" : "text-(--color-mut)"} />
        </button>

        {!leaf && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-0.5 shrink-0 rounded-md p-0.5 text-(--color-mut) hover:bg-white/10"
          >
            {open ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}

        <div className="min-w-0 flex-1">
          <button onClick={() => onOpen(n)} className="block w-full text-right">
            <span className={`block truncate ${top ? "text-[.98rem] font-bold" : "text-[.9rem]"} ${done ? "line-through" : ""}`}>
              {n.title}
            </span>
          </button>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {n.due_date && (
              <span
                className="chip"
                style={{
                  color: dc === "over" ? "#FF8A9B" : dc === "soon" ? "#F0BC72" : undefined,
                  borderColor: dc === "over" ? "rgba(255,138,155,.4)" : dc === "soon" ? "rgba(240,188,114,.35)" : undefined,
                }}
              >
                <span className="num">{relDue(n.due_date)}</span>
              </span>
            )}
            {n.priority === 1 && <span className="chip border-rose-400/40 text-rose-300"><Flag size={11} /> عاجل</span>}
            {n.estimate_min ? <span className="chip"><Timer size={11} /><span className="num">{n.estimate_min}</span>د</span> : null}
            {n.kind === "habit" && <span className="chip">عادة</span>}
            {n.note && <span className="chip">ملاحظة</span>}
            {(n.tags ?? []).map((t) => <span key={t} className="chip">#{t}</span>)}
            {!leaf && (
              <span className="chip">
                <span className="num">{s.done}/{s.total}</span>
              </span>
            )}
          </div>

          {!leaf && !top && (
            <div className="mt-2">
              <Bar pct={s.pct} color={color} h={4} />
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {!leaf && top && <Donut pct={s.pct} size={54} stroke={6} color={color} />}
          <button
            onClick={addChild}
            title="اضف مهمة فرعية"
            className="rounded-lg p-1.5 text-(--color-mut) opacity-0 transition hover:bg-white/10 hover:text-(--color-txt) group-hover:opacity-100"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {!leaf && open && (
        <TaskTree nodes={kids} color={color} onOpen={onOpen} depth={depth + 1} filter={filter} />
      )}
    </div>
  );
}
