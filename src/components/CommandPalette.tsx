"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, Check } from "lucide-react";
import { useStore } from "./Store";
import { flatten } from "@/lib/tree";
import { fmtShort } from "@/lib/dates";

type Item = { id: string; label: string; hint?: string; run: () => void; color?: string };

export default function CommandPalette({ onClose, openAdd }: { onClose: () => void; openAdd: () => void }) {
  const r = useRouter();
  const { areas, allTree, setStatus } = useStore();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

  const items = useMemo<Item[]>(() => {
    const cmds: Item[] = [
      { id: "c-add", label: "اضافة سريعة", hint: "N", run: openAdd },
      { id: "c-home", label: "الرئيسية", run: () => r.push("/") },
      { id: "c-today", label: "مهام اليوم", run: () => r.push("/today") },
      { id: "c-week", label: "اسبوعي", run: () => r.push("/calendar") },
      { id: "c-hab", label: "العادات", run: () => r.push("/habits") },
      { id: "c-track", label: "المتابعة الصحية", run: () => r.push("/tracker") },
      { id: "c-money", label: "المالي", run: () => r.push("/money") },
      { id: "c-rev", label: "المراجعة الاسبوعية", run: () => r.push("/review") },
      { id: "c-arch", label: "الانجازات", run: () => r.push("/archive") },
      { id: "c-set", label: "الاعدادات", run: () => r.push("/settings") },
      ...areas.map((a) => ({
        id: "a-" + a.id,
        label: a.name,
        hint: "جانب",
        color: a.color,
        run: () => r.push(`/area/${a.slug}`),
      })),
    ];
    const tasks: Item[] = flatten(allTree)
      .filter((n) => n.status !== "done")
      .map((n) => {
        const area = areas.find((a) => a.id === n.area_id);
        return {
          id: n.id,
          label: n.title,
          hint: [area?.name, n.due_date ? fmtShort(n.due_date) : ""].filter(Boolean).join(" · "),
          color: area?.color,
          run: () => r.push(`/area/${area?.slug ?? ""}?node=${n.id}`),
        };
      });
    const all = [...cmds, ...tasks];
    if (!q.trim()) return all.slice(0, 40);
    const s = q.trim();
    return all.filter((x) => x.label.includes(s) || (x.hint ?? "").includes(s)).slice(0, 40);
  }, [q, areas, allTree, r, openAdd]);

  useEffect(() => setI(0), [q]);

  const done = async (id: string) => {
    await setStatus(id, "done");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center p-4 pt-[10vh]">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className="pop relative w-full max-w-[620px] overflow-hidden rounded-3xl border border-white/12 bg-[#2A1531] shadow-[0_30px_80px_rgba(0,0,0,.6)]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <Search size={17} className="text-(--color-mut)" />
          <input
            ref={ref}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(x + 1, items.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); }
              if (e.key === "Enter") {
                const it = items[i];
                if (!it) return;
                if (e.metaKey || e.ctrlKey) { if (!it.id.startsWith("c-") && !it.id.startsWith("a-")) done(it.id); return; }
                it.run(); onClose();
              }
            }}
            placeholder="ابحث عن مهمة او نفذ امر..."
            className="w-full bg-transparent text-[.95rem] outline-none placeholder:text-(--color-mut)/70"
          />
        </div>

        <div className="hide-scroll max-h-[52vh] overflow-y-auto p-2">
          {items.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-(--color-mut)">ما فيه نتائج</div>
          )}
          {items.map((it, k) => (
            <button
              key={it.id}
              onMouseEnter={() => setI(k)}
              onClick={() => { it.run(); onClose(); }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-right text-sm transition ${
                k === i ? "bg-white/10" : ""
              }`}
            >
              {it.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: it.color }} />}
              <span className="truncate">{it.label}</span>
              {it.hint && <span className="mr-auto shrink-0 text-[.7rem] text-(--color-mut)">{it.hint}</span>}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-white/10 px-4 py-2 text-[.68rem] text-(--color-mut)">
          <span className="flex items-center gap-1"><CornerDownLeft size={12} /> فتح</span>
          <span className="flex items-center gap-1"><Check size={12} /> ⌘+Enter انجاز</span>
          <span className="mr-auto">Esc اغلاق</span>
        </div>
      </div>
    </div>
  );
}
