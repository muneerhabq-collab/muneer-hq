"use client";

import { useEffect, useState } from "react";
import { X, Trash2, CalendarPlus, Plus, ChevronLeft } from "lucide-react";
import type { TreeNode } from "@/lib/types";
import { useStore } from "./Store";
import { stats, pathTo } from "@/lib/tree";
import { fmtDate } from "@/lib/dates";
import Donut from "./Donut";

const PRIOS = [
  { v: 1, t: "عاجل" }, { v: 2, t: "مهم" }, { v: 3, t: "عادي" }, { v: 4, t: "لاحقا" },
];
const ENERGY = [
  { v: "high", t: "تركيز عالي" }, { v: "medium", t: "متوسط" }, { v: "low", t: "خفيف" },
];
const STATUS = [
  { v: "todo", t: "لم تبدأ" }, { v: "doing", t: "شغال عليها" },
  { v: "done", t: "منجزة" }, { v: "blocked", t: "معلقة" }, { v: "dropped", t: "ملغاة" },
];

export default function TaskPanel({
  node, roots, color, onClose, onOpen,
}: {
  node: TreeNode; roots: TreeNode[]; color: string;
  onClose: () => void; onOpen: (n: TreeNode) => void;
}) {
  const { patchNode, removeNode, setStatus, addNode, say } = useStore();
  const [d, setD] = useState(node);
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setD(node), [node]);

  const s = stats(node);
  const crumbs = pathTo(roots, node.id) ?? [];

  const save = (p: Partial<TreeNode>) => {
    setD((c) => ({ ...c, ...p }));
    patchNode(node.id, p as any);
  };

  const schedule = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/calendar/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ node_id: node.id }),
      });
      const j = await r.json();
      say(j.ok ? `تم الحجز في الكالندر: ${j.when}` : j.error || "تعذر الحجز");
    } catch {
      say("تعذر الاتصال بالكالندر");
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[85] flex justify-start">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <aside className="slidein relative mr-auto h-full w-full max-w-[470px] overflow-y-auto border-l border-white/10 bg-[#26142C] p-5 shadow-[0_0_80px_rgba(0,0,0,.6)]">
        <div className="mb-4 flex items-start gap-3">
          <button onClick={onClose} className="rounded-lg p-1.5 text-(--color-mut) hover:bg-white/10">
            <X size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1 text-[.7rem] text-(--color-mut)">
              {crumbs.slice(0, -1).map((c) => (
                <span key={c.id} className="flex items-center gap-1">
                  <button onClick={() => onOpen(c)} className="hover:text-(--color-txt)">{c.title}</button>
                  <ChevronLeft size={11} />
                </span>
              ))}
            </div>
          </div>
          {node.kids.length > 0 && <Donut pct={s.pct} size={52} stroke={6} color={color} />}
        </div>

        <textarea
          value={d.title}
          onChange={(e) => setD((c) => ({ ...c, title: e.target.value }))}
          onBlur={() => save({ title: d.title })}
          rows={2}
          className="mb-3 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 text-[1.05rem] font-bold outline-none focus:border-(--color-accent)/60"
        />

        <div className="mb-4 flex flex-wrap gap-1.5">
          {STATUS.map((x) => (
            <button
              key={x.v}
              onClick={() => setStatus(node.id, x.v as any)}
              className={`rounded-xl border px-3 py-1.5 text-xs transition ${
                d.status === x.v
                  ? "border-transparent bg-(--color-accent) font-bold text-[#1F0F25]"
                  : "border-white/12 text-(--color-mut) hover:bg-white/8"
              }`}
            >
              {x.t}
            </button>
          ))}
        </div>

        <Field label="ملاحظة">
          <textarea
            value={d.note ?? ""}
            onChange={(e) => setD((c) => ({ ...c, note: e.target.value }))}
            onBlur={() => save({ note: d.note })}
            rows={4}
            placeholder="تفاصيل، خطوات، روابط..."
            className="w-full resize-y rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-(--color-accent)/60"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="يبدأ">
            <input
              type="date" value={d.start_date ?? ""}
              onChange={(e) => save({ start_date: e.target.value || null })}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
            />
          </Field>
          <Field label="الديدلاين">
            <input
              type="date" value={d.due_date ?? ""}
              onChange={(e) => save({ due_date: e.target.value || null })}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="الاولوية">
            <select
              value={d.priority ?? 2}
              onChange={(e) => save({ priority: Number(e.target.value) })}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
            >
              {PRIOS.map((p) => <option key={p.v} value={p.v}>{p.t}</option>)}
            </select>
          </Field>
          <Field label="الطاقة">
            <select
              value={d.energy ?? "medium"}
              onChange={(e) => save({ energy: e.target.value as any })}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
            >
              {ENERGY.map((p) => <option key={p.v} value={p.v}>{p.t}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="الوقت المقدر (دقيقة)">
            <input
              type="number" min={5} step={5} value={d.estimate_min ?? ""}
              onChange={(e) => save({ estimate_min: e.target.value ? Number(e.target.value) : null })}
              className="num w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
            />
          </Field>
          <Field label="الوزن في النسبة">
            <input
              type="number" min={0.5} step={0.5} value={Number(d.weight ?? 1)}
              onChange={(e) => save({ weight: Number(e.target.value) || 1 })}
              className="num w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
            />
          </Field>
        </div>

        <Field label="الوسوم">
          <div className="flex flex-wrap items-center gap-1.5">
            {(d.tags ?? []).map((t) => (
              <button
                key={t}
                onClick={() => save({ tags: (d.tags ?? []).filter((x) => x !== t) })}
                className="chip hover:border-rose-400/50 hover:text-rose-300"
              >
                #{t} ×
              </button>
            ))}
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tag.trim()) {
                  save({ tags: [...(d.tags ?? []), tag.trim()] });
                  setTag("");
                }
              }}
              placeholder="+ وسم"
              className="w-24 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs outline-none"
            />
          </div>
        </Field>

        {node.kind === "habit" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="التكرار">
              <select
                value={d.recurrence ?? "daily"}
                onChange={(e) => save({ recurrence: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
              >
                <option value="daily">يوميا</option>
                <option value="weekly">اسبوعيا</option>
                <option value="monthly">شهريا</option>
              </select>
            </Field>
            <Field label="المستهدف بالاسبوع">
              <input
                type="number" min={1} max={7} value={d.target_per_week ?? ""}
                onChange={(e) => save({ target_per_week: e.target.value ? Number(e.target.value) : null })}
                className="num w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
              />
            </Field>
          </div>
        )}

        <div className="mb-4 mt-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[.72rem] font-bold text-(--color-mut)">
              المهام الفرعية <span className="num">({node.kids.length})</span>
            </span>
            <button
              onClick={() => addNode({ title: "مهمة فرعية", area_id: node.area_id, parent_id: node.id, sort: (node.kids.at(-1)?.sort ?? 0) + 10 })}
              className="chip hover:bg-white/10"
            >
              <Plus size={12} /> اضف
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {node.kids.map((k) => {
              const ks = stats(k);
              return (
                <button
                  key={k.id}
                  onClick={() => onOpen(k)}
                  className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/3 px-3 py-2 text-right text-sm hover:bg-white/8"
                >
                  <span className={k.status === "done" ? "line-through opacity-60" : ""}>{k.title}</span>
                  <span className="num mr-auto text-[.7rem] text-(--color-mut)">{ks.pct}%</span>
                </button>
              );
            })}
            {node.kids.length === 0 && (
              <p className="rounded-xl border border-dashed border-white/12 px-3 py-3 text-center text-xs text-(--color-mut)">
                ما فيه مهام فرعية. هذي مهمة نهائية وتحسب في النسبة.
              </p>
            )}
          </div>
        </div>

        {d.done_at && (
          <p className="mb-3 text-[.72rem] text-(--color-mut)">
            انجزت في <span className="num">{fmtDate(d.done_at.slice(0, 10))}</span>
          </p>
        )}

        <div className="flex gap-2 border-t border-white/10 pt-4">
          <button
            onClick={schedule}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-(--color-accent)/40 px-3 py-2.5 text-sm text-(--color-accent) transition hover:bg-(--color-accent)/12 disabled:opacity-50"
          >
            <CalendarPlus size={16} /> {busy ? "جاري الحجز..." : "احجزها بالكالندر"}
          </button>
          <button
            onClick={async () => { await removeNode(node.id); onClose(); }}
            className="rounded-xl border border-rose-400/30 px-3 py-2.5 text-rose-300 transition hover:bg-rose-400/12"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-[.72rem] font-bold text-(--color-mut)">{label}</label>
      {children}
    </div>
  );
}
