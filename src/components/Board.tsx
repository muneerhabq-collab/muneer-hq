"use client";

import type { TreeNode, NodeStatus } from "@/lib/types";
import { useStore } from "./Store";
import { relDue, dueClass } from "@/lib/dates";
import { useState } from "react";

const COLS: Array<{ k: NodeStatus; t: string }> = [
  { k: "todo", t: "لم تبدأ" },
  { k: "doing", t: "شغال عليها" },
  { k: "blocked", t: "معلقة" },
  { k: "done", t: "منجزة" },
];

export default function Board({
  nodes, color, onOpen,
}: { nodes: TreeNode[]; color: string; onOpen: (n: TreeNode) => void }) {
  const { setStatus } = useStore();
  const [over, setOver] = useState<string | null>(null);

  return (
    <div className="hide-scroll grid gap-3 overflow-x-auto md:grid-cols-4">
      {COLS.map((c) => {
        const list = nodes.filter((n) => n.status === c.k);
        return (
          <div
            key={c.k}
            onDragOver={(e) => { e.preventDefault(); setOver(c.k); }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/id");
              setOver(null);
              if (id) setStatus(id, c.k);
            }}
            className={`min-w-[230px] rounded-2xl border p-2.5 transition ${
              over === c.k ? "border-(--color-accent) bg-white/8" : "border-white/8 bg-white/3"
            }`}
          >
            <div className="mb-2 flex items-center gap-2 px-1 text-xs font-bold">
              <span className="h-2 w-2 rounded-full" style={{ background: color, opacity: c.k === "done" ? 1 : 0.5 }} />
              {c.t}
              <span className="num mr-auto text-(--color-mut)">{list.length}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {list.map((n) => {
                const dc = dueClass(n.due_date, n.status === "done");
                return (
                  <button
                    key={n.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/id", n.id)}
                    onClick={() => onOpen(n)}
                    className="rounded-xl border border-white/8 bg-[#2A1531] p-2.5 text-right text-[.83rem] transition hover:bg-white/8"
                  >
                    <span className={n.status === "done" ? "line-through opacity-60" : ""}>{n.title}</span>
                    {n.due_date && (
                      <span
                        className="num mt-1.5 block text-[.68rem]"
                        style={{ color: dc === "over" ? "#FF8A9B" : dc === "soon" ? "#F0BC72" : "#B79FC4" }}
                      >
                        {relDue(n.due_date)}
                      </span>
                    )}
                  </button>
                );
              })}
              {list.length === 0 && (
                <p className="px-1 py-3 text-center text-[.7rem] text-(--color-mut)">فاضي</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
