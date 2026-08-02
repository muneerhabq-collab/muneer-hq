"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, ChevronRight, ChevronLeft, Save, Sparkles } from "lucide-react";
import { useStore } from "@/components/Store";
import { supabaseBrowser } from "@/lib/supabase/client";
import Donut from "@/components/Donut";
import Bar from "@/components/Bar";
import { statsOf, flatten } from "@/lib/tree";
import { todayISO, weekStart, addDays, fmtShort, fmtDate } from "@/lib/dates";

export default function Review() {
  const { areas, tree, allTree, habitLogs, say } = useStore();
  const sb = useMemo(() => supabaseBrowser(), []);
  const [off, setOff] = useState(0);
  const [row, setRow] = useState<any>(null);
  const [f, setF] = useState({ wins: "", blockers: "", notes: "", constraints: {} as Record<string, string> });

  const t = todayISO();
  const ws = addDays(weekStart(t), off * 7);
  const we = addDays(ws, 6);

  useEffect(() => {
    (async () => {
      const { data } = await sb.from("reviews").select("*").eq("week_start", ws).maybeSingle();
      setRow(data);
      setF({
        wins: data?.wins ?? "",
        blockers: data?.blockers ?? "",
        notes: data?.notes ?? "",
        constraints: data?.constraints ?? {},
      });
    })();
  }, [ws, sb]);

  const leaves = useMemo(() => flatten(allTree).filter((n) => n.kids.length === 0), [allTree]);
  const doneThis = leaves.filter((n) => n.status === "done" && n.done_at && n.done_at.slice(0, 10) >= ws && n.done_at.slice(0, 10) <= we);
  const missed = leaves.filter((n) => n.status !== "done" && n.due_date && n.due_date >= ws && n.due_date <= we);
  const habitPct = (() => {
    const habits = leaves.filter((n) => n.kind === "habit");
    if (!habits.length) return 0;
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    const hit = habitLogs.filter((l) => days.includes(l.log_date)).length;
    return Math.round((hit / (habits.length * 7)) * 100);
  })();

  const per = areas.map((a) => ({ a, s: statsOf(tree.get(a.id) ?? []) }));
  const weakest = [...per].sort((x, y) => x.s.pct - y.s.pct)[0];

  const save = async (complete = false) => {
    const payload = {
      week_start: ws,
      wins: f.wins,
      blockers: f.blockers,
      notes: f.notes,
      constraints: f.constraints,
      snapshot: {
        done: doneThis.length,
        missed: missed.length,
        habits: habitPct,
        areas: per.map((p) => ({ slug: p.a.slug, pct: p.s.pct })),
      },
      ...(complete ? { completed_at: new Date().toISOString() } : {}),
    };
    const { data: { user } } = await sb.auth.getUser();
    const { data } = await sb
      .from("reviews")
      .upsert({ user_id: user!.id, ...payload }, { onConflict: "user_id,week_start" })
      .select()
      .single();
    setRow(data);
    say(complete ? "تمت المراجعة. اسبوع جديد يبدأ." : "تم الحفظ");
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="rise flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2 text-xl font-extrabold">
          <ClipboardCheck size={20} className="text-(--color-sky)" /> المراجعة الاسبوعية
        </h1>
        <div className="flex items-center gap-1">
          <button onClick={() => setOff((o) => o + 1)} className="rounded-lg border border-white/12 p-1.5 hover:bg-white/8">
            <ChevronRight size={16} />
          </button>
          <span className="px-2 text-xs text-(--color-mut)"><bdi className="num">{fmtShort(ws)}</bdi> - <bdi className="num">{fmtDate(we)}</bdi></span>
          <button onClick={() => setOff((o) => Math.min(0, o - 1))} className="rounded-lg border border-white/12 p-1.5 hover:bg-white/8">
            <ChevronLeft size={16} />
          </button>
        </div>
        {row?.completed_at && <span className="chip border-(--color-lime)/40 text-(--color-lime)">مكتملة</span>}
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <Mini t="انجزت" v={doneThis.length} c="#6BCB77" />
        <Mini t="فاتتك" v={missed.length} c="#FF8A9B" />
        <Mini t="التزام العادات" v={`${habitPct}%`} c="#5EC5C0" />
        <Mini t="الاضعف" v={weakest?.a.name ?? "-"} c={weakest?.a.color ?? "#B98CE6"} />
      </div>

      <section className="rise card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-bold">
          <Sparkles size={15} className="text-(--color-accent)" /> القيد الواحد لكل جانب
        </h2>
        <p className="mb-4 text-[.75rem] leading-relaxed text-(--color-mut)">
          مو كل شي يتصلح مرة وحدة. حدد القيد الوحيد اللي لو انفك هذا الاسبوع تتحرك كل الجوانب.
        </p>
        <div className="flex flex-col gap-3">
          {per.map(({ a, s }) => (
            <div key={a.id} className="rounded-2xl border border-white/8 bg-white/3 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                <b className="text-[.85rem]">{a.name}</b>
                <span className="num mr-auto text-[.72rem] text-(--color-mut)">{s.pct}%</span>
              </div>
              <Bar pct={s.pct} color={a.color} h={4} />
              <input
                value={f.constraints[a.id] ?? ""}
                onChange={(e) => setF({ ...f, constraints: { ...f.constraints, [a.id]: e.target.value } })}
                onBlur={() => save(false)}
                placeholder="القيد الواحد هذا الاسبوع..."
                className="mt-2.5 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-(--color-accent)/60"
              />
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Box label="اللي مشى صح" v={f.wins} on={(v: string) => setF({ ...f, wins: v })} onBlur={() => save(false)} />
        <Box label="اللي عطلني" v={f.blockers} on={(v: string) => setF({ ...f, blockers: v })} onBlur={() => save(false)} />
      </div>

      <Box label="ملاحظات وقرارات الاسبوع الجاي" v={f.notes} on={(v: string) => setF({ ...f, notes: v })} onBlur={() => save(false)} rows={5} />

      {doneThis.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-bold">اللي خلصته هذا الاسبوع</h2>
          <div className="flex flex-col gap-1">
            {doneThis.map((n) => (
              <div key={n.id} className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/3 px-3 py-1.5 text-[.82rem]">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: areas.find((a) => a.id === n.area_id)?.color }} />
                {n.title}
                <span className="num mr-auto text-[.68rem] text-(--color-mut)">{fmtShort(n.done_at!.slice(0, 10))}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <button
        onClick={() => save(true)}
        className="flex items-center justify-center gap-2 rounded-2xl bg-(--color-accent) px-4 py-3 font-bold text-[#1F0F25] hover:brightness-110"
      >
        <Save size={17} /> اقفل المراجعة
      </button>
    </div>
  );
}

function Mini({ t, v, c }: any) {
  return (
    <div className="rise card p-4">
      <p className="text-[.72rem] text-(--color-mut)">{t}</p>
      <b className="num mt-1 block text-lg" style={{ color: c }}>{v}</b>
    </div>
  );
}

function Box({ label, v, on, onBlur, rows = 4 }: any) {
  return (
    <section className="card p-4">
      <label className="mb-2 block text-sm font-bold">{label}</label>
      <textarea
        value={v}
        onChange={(e) => on(e.target.value)}
        onBlur={onBlur}
        rows={rows}
        className="w-full resize-y rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-(--color-accent)/60"
      />
    </section>
  );
}
