"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, CornerDownLeft } from "lucide-react";
import { useStore } from "./Store";
import { parseQuickAdd } from "@/lib/nlp";
import { fmtShort } from "@/lib/dates";
import { flatten } from "@/lib/tree";

const PRIO = ["", "عاجل", "مهم", "عادي", "لاحقا"];

export default function QuickAdd({
  onClose,
  defaultParent,
  defaultArea,
}: { onClose: () => void; defaultParent?: string | null; defaultArea?: string | null }) {
  const { areas, addNode, allTree, say } = useStore();
  const [txt, setTxt] = useState("");
  const [areaId, setAreaId] = useState<string | null>(defaultArea ?? areas[0]?.id ?? null);
  const [parentId, setParentId] = useState<string | null>(defaultParent ?? null);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => ref.current?.focus(), []);

  const p = useMemo(() => parseQuickAdd(txt || " "), [txt]);

  useEffect(() => {
    if (p.areaHint && !defaultArea) {
      const a = areas.find((x) => x.slug === p.areaHint || x.name.includes(p.areaHint!));
      if (a) setAreaId(a.id);
    }
  }, [p.areaHint, areas, defaultArea]);

  const parents = useMemo(
    () => flatten(allTree).filter((n) => n.area_id === areaId && n.kind !== "habit"),
    [allTree, areaId]
  );

  const submit = async () => {
    if (!txt.trim()) return;
    await addNode({
      title: p.title,
      due_date: p.due_date,
      priority: p.priority,
      energy: p.energy ?? "medium",
      estimate_min: p.estimate_min,
      tags: p.tags,
      kind: p.kind,
      recurrence: p.recurrence,
      area_id: areaId,
      parent_id: parentId,
    });
    say("تمت الاضافة");
    setTxt("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className="pop relative w-full max-w-[620px] rounded-3xl border border-white/12 bg-[#2A1531] p-4 shadow-[0_30px_80px_rgba(0,0,0,.6)]">
        <div className="mb-2 flex items-center gap-2 text-xs text-(--color-mut)">
          <Sparkles size={14} className="text-(--color-accent)" />
          اكتب بالعربي عادي: <span className="text-(--color-txt)">اتصل بفهد بكرة عاجل 30د #مبيعات</span>
        </div>

        <input
          ref={ref}
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="وش تبغى تسوي؟"
          className="w-full rounded-2xl border border-white/12 bg-black/25 px-4 py-3 text-[.98rem] outline-none placeholder:text-(--color-mut)/70 focus:border-(--color-accent)/60"
        />

        {txt.trim() && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[.72rem]">
            <span className="chip border-(--color-accent)/40 text-(--color-accent)">{p.title}</span>
            {p.due_date && <span className="chip"><span className="num">{fmtShort(p.due_date)}</span></span>}
            {p.priority !== 2 && <span className="chip">{PRIO[p.priority]}</span>}
            {p.estimate_min && <span className="chip"><span className="num">{p.estimate_min}</span> دقيقة</span>}
            {p.energy && <span className="chip">طاقة {p.energy === "high" ? "عالية" : p.energy === "low" ? "منخفضة" : "متوسطة"}</span>}
            {p.recurrence && <span className="chip">عادة {p.recurrence === "daily" ? "يومية" : p.recurrence === "weekly" ? "اسبوعية" : "شهرية"}</span>}
            {p.tags.map((t) => <span key={t} className="chip">#{t}</span>)}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={areaId ?? ""}
            onChange={(e) => { setAreaId(e.target.value || null); setParentId(null); }}
            className="rounded-xl border border-white/12 bg-black/25 px-3 py-2 text-sm outline-none"
          >
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>

          <select
            value={parentId ?? ""}
            onChange={(e) => setParentId(e.target.value || null)}
            className="min-w-0 flex-1 rounded-xl border border-white/12 bg-black/25 px-3 py-2 text-sm outline-none"
          >
            <option value="">بدون مهمة اب (مستوى اول)</option>
            {parents.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
          </select>

          <button
            onClick={submit}
            className="flex items-center gap-1.5 rounded-xl bg-(--color-accent) px-4 py-2 text-sm font-bold text-[#1F0F25] hover:brightness-110"
          >
            اضف <CornerDownLeft size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
