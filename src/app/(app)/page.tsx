"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft, Flame, AlertTriangle, CalendarClock, Trophy, Repeat } from "lucide-react";
import { useStore } from "@/components/Store";
import Donut from "@/components/Donut";
import Bar from "@/components/Bar";
import LifeWheel from "@/components/LifeWheel";
import Onboard from "@/components/Onboard";
import { statsOf, flatten } from "@/lib/tree";
import { todayISO, daysUntil, fmtShort, weekStart, addDays } from "@/lib/dates";

export default function Home() {
  const { areas, tree, allTree, habitLogs, achievements, profile } = useStore();

  const per = useMemo(
    () => areas.map((a) => {
      const t = tree.get(a.id) ?? [];
      return { area: a, s: statsOf(t), roots: t };
    }),
    [areas, tree]
  );

  const overall = useMemo(() => statsOf(allTree), [allTree]);

  const flat = useMemo(() => flatten(allTree).filter((n) => n.kids.length === 0), [allTree]);
  const t = todayISO();
  const wEnd = addDays(weekStart(t), 6);

  const overdue = flat.filter((n) => n.status !== "done" && n.due_date && n.due_date < t);
  const today = flat.filter((n) => n.status !== "done" && n.due_date === t);
  const week = flat.filter((n) => n.status !== "done" && n.due_date && n.due_date >= t && n.due_date <= wEnd);
  const habitsToday = flat.filter((n) => n.kind === "habit");
  const habitDone = habitsToday.filter((h) => habitLogs.some((l) => l.node_id === h.id && l.log_date === t));

  const hFrom = profile?.horizon_from ?? "2026-08-01";
  const hTo = profile?.horizon_to ?? "2026-12-31";
  const left = daysUntil(hTo) ?? 0;
  const span = Math.max(1, Math.round((new Date(hTo).getTime() - new Date(hFrom).getTime()) / 86400000));
  const elapsed = Math.max(0, Math.min(100, Math.round(((span - left) / span) * 100)));

  if (areas.length === 0) return <Onboard />;

  return (
    <div className="flex flex-col gap-5">
      {/* ------------------------------------------------------------ الراس */}
      <header className="rise card flex flex-wrap items-center gap-5 p-5">
        <Donut pct={overall.pct} size={92} stroke={9} />
        <div className="min-w-[200px] flex-1">
          <h1 className="text-xl font-extrabold">
            {profile?.full_name ? `يا هلا ${profile.full_name.split(" ")[0]}` : "يا هلا"}
          </h1>
          <p className="mt-1 text-sm text-(--color-mut)">
            انجزت <b className="num text-(--color-txt)">{overall.done}</b> من{" "}
            <b className="num text-(--color-txt)">{overall.total}</b> مهمة نهائية
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[.72rem]">
            <span className="chip">باقي <span className="num">{Math.max(0, left)}</span> يوم على نهاية الافق</span>
            <span className="chip">مضى <span className="num">{elapsed}%</span> من الوقت</span>
            {overall.pct >= elapsed
              ? <span className="chip border-(--color-lime)/40 text-(--color-lime)">قدام الجدول</span>
              : <span className="chip border-(--color-amber)/40 text-(--color-amber)">متأخر عن الجدول</span>}
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------- بطاقات سريعة */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat href="/today" icon={AlertTriangle} n={overdue.length} label="متأخرة" tone="#FF8A9B" />
        <Stat href="/today" icon={Flame} n={today.length} label="مهام اليوم" tone="#E0A75E" />
        <Stat href="/calendar" icon={CalendarClock} n={week.length} label="هذا الاسبوع" tone="#7C9CE0" />
        <Stat href="/habits" icon={Repeat} n={habitDone.length} sub={`/${habitsToday.length}`} label="عادات اليوم" tone="#5EC5C0" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* ------------------------------------------------------- الجوانب */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-(--color-mut)">جوانب الحياة</h2>
          {per.map(({ area, s, roots }, i) => (
            <Link
              key={area.id}
              href={`/area/${area.slug}`}
              className="rise card group flex items-center gap-4 p-4 transition hover:bg-white/8"
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <Donut pct={s.pct} size={62} stroke={7} color={area.color} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: area.color }} />
                  <b className="truncate">{area.name}</b>
                  <span className="num mr-auto text-[.72rem] text-(--color-mut)">
                    {s.done}/{s.total}
                  </span>
                </div>
                <p className="mt-1 truncate text-[.75rem] text-(--color-mut)">
                  {roots.map((r) => r.title).join(" · ") || "ما فيه مهام بعد"}
                </p>
                <div className="mt-2"><Bar pct={s.pct} color={area.color} /></div>
              </div>
              <ArrowLeft size={17} className="shrink-0 text-(--color-mut) transition group-hover:-translate-x-1" />
            </Link>
          ))}
        </section>

        {/* ------------------------------------------------------- الجانب الايسر */}
        <aside className="flex flex-col gap-5">
          <section className="rise card p-4">
            <h2 className="mb-1 text-sm font-bold">عجلة التوازن</h2>
            <p className="mb-2 text-[.7rem] text-(--color-mut)">
              الشكل المثالي دائرة. اي ضلع قصير يعني جانب مهمل.
            </p>
            <LifeWheel
              size={288}
              data={per.map((p) => ({ name: p.area.name, pct: p.s.pct, color: p.area.color }))}
            />
          </section>

          <section className="rise card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Trophy size={15} className="text-(--color-amber)" /> اخر الانجازات
            </h2>
            <div className="flex flex-col gap-2">
              {achievements.slice(0, 5).map((a) => (
                <div key={a.id} className="rounded-xl border border-white/8 bg-white/3 px-3 py-2">
                  <p className="text-[.82rem]">{a.title}</p>
                  <span className="num text-[.68rem] text-(--color-mut)">{fmtShort(a.happened_on)}</span>
                </div>
              ))}
              {achievements.length === 0 && (
                <p className="text-[.78rem] text-(--color-mut)">
                  اول ما تخلص هدف او مشروع بينضاف هنا تلقائيا.
                </p>
              )}
            </div>
            <Link href="/archive" className="mt-3 block text-center text-[.75rem] text-(--color-accent) hover:underline">
              كل الانجازات
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Stat({ href, icon: Icon, n, sub, label, tone }: any) {
  return (
    <Link href={href} className="rise card flex items-center gap-3 p-4 transition hover:bg-white/8">
      <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: `${tone}22`, color: tone }}>
        <Icon size={19} />
      </span>
      <div>
        <b className="num text-xl">{n}{sub && <span className="text-sm text-(--color-mut)">{sub}</span>}</b>
        <p className="text-[.75rem] text-(--color-mut)">{label}</p>
      </div>
    </Link>
  );
}
