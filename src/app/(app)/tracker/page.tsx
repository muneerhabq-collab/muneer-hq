"use client";

import { useMemo, useState } from "react";
import { Activity, Save } from "lucide-react";
import { useStore } from "@/components/Store";
import Spark from "@/components/Spark";
import { todayISO, fmtShort } from "@/lib/dates";

export default function Tracker() {
  const { metrics, upsertMetric } = useStore();
  const t = todayISO();
  const cur = metrics.find((m) => m.metric_date === t);

  const [f, setF] = useState({
    weight_kg: cur?.weight_kg ?? "",
    body_fat: cur?.body_fat ?? "",
    sleep_hours: cur?.sleep_hours ?? "",
    energy: cur?.energy ?? 3,
    exercised: cur?.exercised ?? false,
    steps: cur?.steps ?? "",
    note: cur?.note ?? "",
  });

  const sorted = useMemo(() => [...metrics].sort((a, b) => a.metric_date.localeCompare(b.metric_date)), [metrics]);
  const series = (k: "weight_kg" | "sleep_hours" | "energy" | "steps") =>
    sorted.filter((m) => m[k] != null).slice(-45).map((m) => ({ x: m.metric_date, y: Number(m[k]) }));

  const save = () =>
    upsertMetric({
      metric_date: t,
      weight_kg: f.weight_kg === "" ? null : Number(f.weight_kg),
      body_fat: f.body_fat === "" ? null : Number(f.body_fat),
      sleep_hours: f.sleep_hours === "" ? null : Number(f.sleep_hours),
      energy: Number(f.energy),
      exercised: !!f.exercised,
      steps: f.steps === "" ? null : Number(f.steps),
      note: f.note || null,
    });

  const w = series("weight_kg");
  const delta = w.length > 1 ? Number((w.at(-1)!.y - w[0].y).toFixed(1)) : 0;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="flex items-center gap-2 text-xl font-extrabold">
        <Activity size={20} className="text-(--color-mint)" /> المتابعة اليومية
      </h1>

      <section className="rise card p-5">
        <h2 className="mb-3 text-sm font-bold">قياس اليوم</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Num label="الوزن (كجم)" v={f.weight_kg} on={(v) => setF({ ...f, weight_kg: v })} step="0.1" />
          <Num label="نسبة الدهون %" v={f.body_fat} on={(v) => setF({ ...f, body_fat: v })} step="0.1" />
          <Num label="النوم (ساعات)" v={f.sleep_hours} on={(v) => setF({ ...f, sleep_hours: v })} step="0.5" />
          <Num label="الخطوات" v={f.steps} on={(v) => setF({ ...f, steps: v })} step="100" />
          <div>
            <label className="mb-1 block text-[.72rem] font-bold text-(--color-mut)">الطاقة</label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setF({ ...f, energy: n })}
                  className={`num h-9 flex-1 rounded-xl border text-sm transition ${
                    Number(f.energy) === n
                      ? "border-transparent bg-(--color-mint) font-bold text-[#1F0F25]"
                      : "border-white/12 text-(--color-mut) hover:bg-white/8"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[.72rem] font-bold text-(--color-mut)">الرياضة</label>
            <button
              onClick={() => setF({ ...f, exercised: !f.exercised })}
              className={`h-9 w-full rounded-xl border text-sm transition ${
                f.exercised ? "border-transparent bg-(--color-lime) font-bold text-[#1F0F25]" : "border-white/12 text-(--color-mut)"
              }`}
            >
              {f.exercised ? "تمرنت اليوم" : "ما تمرنت"}
            </button>
          </div>
        </div>
        <input
          value={f.note}
          onChange={(e) => setF({ ...f, note: e.target.value })}
          placeholder="ملاحظة عن اليوم..."
          className="mt-3 w-full rounded-xl border border-white/12 bg-black/25 px-3 py-2.5 text-sm outline-none"
        />
        <button
          onClick={save}
          className="mt-3 flex items-center gap-2 rounded-xl bg-(--color-mint) px-4 py-2.5 text-sm font-bold text-[#1F0F25] hover:brightness-110"
        >
          <Save size={16} /> احفظ قياس اليوم
        </button>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Chart title="الوزن" sub={delta ? `${delta > 0 ? "+" : ""}${delta} كجم من اول قياس` : ""} data={w} color="#5EC5C0" unit=" كجم" />
        <Chart title="النوم" data={series("sleep_hours")} color="#7C9CE0" unit=" س" />
        <Chart title="الطاقة" data={series("energy")} color="#B98CE6" />
        <Chart title="الخطوات" data={series("steps")} color="#E0A75E" />
      </div>

      <section className="card p-4">
        <h2 className="mb-2 text-sm font-bold">اخر القياسات</h2>
        <div className="hide-scroll overflow-x-auto">
          <table className="w-full text-right text-[.8rem]">
            <thead className="text-[.7rem] text-(--color-mut)">
              <tr>
                <th className="p-2 font-normal">التاريخ</th>
                <th className="p-2 font-normal">وزن</th>
                <th className="p-2 font-normal">نوم</th>
                <th className="p-2 font-normal">طاقة</th>
                <th className="p-2 font-normal">رياضة</th>
              </tr>
            </thead>
            <tbody>
              {metrics.slice(0, 14).map((m) => (
                <tr key={m.id} className="border-t border-white/7">
                  <td className="num p-2">{fmtShort(m.metric_date)}</td>
                  <td className="num p-2">{m.weight_kg ?? "-"}</td>
                  <td className="num p-2">{m.sleep_hours ?? "-"}</td>
                  <td className="num p-2">{m.energy ?? "-"}</td>
                  <td className="p-2">{m.exercised ? "نعم" : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {metrics.length === 0 && <p className="py-5 text-center text-xs text-(--color-mut)">ابدأ بقياس اليوم فوق</p>}
        </div>
      </section>
    </div>
  );
}

function Num({ label, v, on, step }: { label: string; v: string | number; on: (v: string) => void; step: string }) {
  return (
    <div>
      <label className="mb-1 block text-[.72rem] font-bold text-(--color-mut)">{label}</label>
      <input
        type="number" step={step} value={v}
        onChange={(e) => on(e.target.value)}
        className="num h-9 w-full rounded-xl border border-white/12 bg-black/25 px-3 text-sm outline-none focus:border-(--color-accent)/60"
      />
    </div>
  );
}

function Chart({ title, sub, data, color, unit }: any) {
  return (
    <section className="rise card p-4">
      <div className="mb-1 flex items-baseline gap-2">
        <h3 className="text-sm font-bold">{title}</h3>
        {sub && <span className="num text-[.7rem] text-(--color-mut)">{sub}</span>}
      </div>
      <Spark points={data} color={color} unit={unit} />
    </section>
  );
}
