"use client";

import { useMemo, useState } from "react";
import { Wallet, Plus, Trash2, Check } from "lucide-react";
import { useStore } from "@/components/Store";
import Bar from "@/components/Bar";
import { todayISO, fmtShort } from "@/lib/dates";

const CATS = ["راتب", "استشارة", "كوتشنق", "شراكة", "منتج", "ايجار", "سيارة", "اشتراكات", "اكل", "صحة", "تعليم", "اخرى"];

export default function Money() {
  const { ledger, addLedger, patchLedger, removeLedger } = useStore();
  const t = todayISO();
  const [f, setF] = useState({
    kind: "income" as "income" | "expense",
    label: "",
    amount: "",
    category: CATS[0],
    entry_date: t,
    expected: false,
  });
  const [month, setMonth] = useState(t.slice(0, 7));

  const months = useMemo(() => {
    const s = new Set(ledger.map((l) => l.entry_date.slice(0, 7)));
    s.add(t.slice(0, 7));
    return [...s].sort().reverse();
  }, [ledger, t]);

  const inMonth = ledger.filter((l) => l.entry_date.startsWith(month));
  const sum = (k: "income" | "expense", only?: "settled" | "expected") =>
    inMonth
      .filter((l) => l.kind === k && (only === "settled" ? l.settled : only === "expected" ? !l.settled : true))
      .reduce((s, l) => s + Number(l.amount), 0);

  const income = sum("income");
  const expense = sum("expense");
  const net = income - expense;
  const settledIncome = sum("income", "settled");

  const totalNet = useMemo(
    () => ledger.reduce((s, l) => s + (l.kind === "income" ? 1 : -1) * Number(l.amount), 0),
    [ledger]
  );

  const add = async () => {
    if (!f.label.trim() || !f.amount) return;
    await addLedger({
      kind: f.kind,
      label: f.label.trim(),
      amount: Number(f.amount),
      category: f.category,
      entry_date: f.entry_date,
      expected: f.expected,
      settled: !f.expected,
    });
    setF({ ...f, label: "", amount: "" });
  };

  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    inMonth.filter((l) => l.kind === "expense").forEach((l) => {
      m.set(l.category ?? "اخرى", (m.get(l.category ?? "اخرى") ?? 0) + Number(l.amount));
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [inMonth]);

  return (
    <div className="flex flex-col gap-5">
      <header className="rise flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2 text-xl font-extrabold">
          <Wallet size={20} className="text-(--color-lime)" /> المالي
        </h1>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="num mr-auto rounded-xl border border-white/12 bg-black/25 px-3 py-2 text-sm outline-none"
        >
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card t="الدخل" v={income} sub={`محصّل ${settledIncome.toLocaleString("en-US")}`} c="#6BCB77" />
        <Card t="المصروف" v={expense} c="#E06C9F" />
        <Card t="الصافي" v={net} sub={`الاجمالي التراكمي ${totalNet.toLocaleString("en-US")}`} c={net >= 0 ? "#B98CE6" : "#FF8A9B"} />
      </div>

      <section className="rise card p-4">
        <h2 className="mb-3 text-sm font-bold">اضف حركة</h2>
        <div className="flex flex-wrap gap-2">
          <div className="flex overflow-hidden rounded-xl border border-white/12">
            {(["income", "expense"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setF({ ...f, kind: k })}
                className={`px-4 py-2 text-sm transition ${
                  f.kind === k ? (k === "income" ? "bg-(--color-lime) font-bold text-[#1F0F25]" : "bg-(--color-rose) font-bold text-[#1F0F25]") : "text-(--color-mut)"
                }`}
              >
                {k === "income" ? "دخل" : "مصروف"}
              </button>
            ))}
          </div>
          <input
            value={f.label}
            onChange={(e) => setF({ ...f, label: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="الوصف"
            className="min-w-[160px] flex-1 rounded-xl border border-white/12 bg-black/25 px-3 py-2 text-sm outline-none"
          />
          <input
            type="number"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="المبلغ"
            className="num w-28 rounded-xl border border-white/12 bg-black/25 px-3 py-2 text-sm outline-none"
          />
          <select
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value })}
            className="rounded-xl border border-white/12 bg-black/25 px-3 py-2 text-sm outline-none"
          >
            {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="date"
            value={f.entry_date}
            onChange={(e) => setF({ ...f, entry_date: e.target.value })}
            className="rounded-xl border border-white/12 bg-black/25 px-3 py-2 text-sm outline-none"
          />
          <button
            onClick={() => setF({ ...f, expected: !f.expected })}
            className={`rounded-xl border px-3 py-2 text-xs ${f.expected ? "border-(--color-amber) text-(--color-amber)" : "border-white/12 text-(--color-mut)"}`}
          >
            {f.expected ? "متوقع" : "فعلي"}
          </button>
          <button onClick={add} className="rounded-xl bg-(--color-accent) px-4 py-2 text-sm font-bold text-[#1F0F25]">
            <Plus size={16} />
          </button>
        </div>
      </section>

      {byCat.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-bold">المصروف حسب البند</h2>
          <div className="flex flex-col gap-2.5">
            {byCat.map(([c, v]) => (
              <div key={c}>
                <div className="mb-1 flex items-center justify-between text-[.78rem]">
                  <span>{c}</span>
                  <span className="num text-(--color-mut)">{v.toLocaleString("en-US")}</span>
                </div>
                <Bar pct={Math.round((v / (expense || 1)) * 100)} color="#E06C9F" h={5} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card p-4">
        <h2 className="mb-2 text-sm font-bold">الحركات</h2>
        <div className="flex flex-col gap-1.5">
          {inMonth.map((l) => (
            <div key={l.id} className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/3 px-3 py-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: l.kind === "income" ? "#6BCB77" : "#E06C9F" }}
              />
              <span className="min-w-0 flex-1 truncate text-[.85rem]">{l.label}</span>
              <span className="chip">{l.category}</span>
              {!l.settled && (
                <button onClick={() => patchLedger(l.id, { settled: true, expected: false })} className="chip border-(--color-amber)/40 text-(--color-amber)">
                  <Check size={11} /> متوقع
                </button>
              )}
              <span className="num text-[.68rem] text-(--color-mut)">{fmtShort(l.entry_date)}</span>
              <b className="num text-[.85rem]" style={{ color: l.kind === "income" ? "#6BCB77" : "#E06C9F" }}>
                {l.kind === "income" ? "+" : "-"}{Number(l.amount).toLocaleString("en-US")}
              </b>
              <button onClick={() => removeLedger(l.id)} className="text-(--color-mut) hover:text-rose-300">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {inMonth.length === 0 && <p className="py-5 text-center text-xs text-(--color-mut)">ما فيه حركات هذا الشهر</p>}
        </div>
      </section>
    </div>
  );
}

function Card({ t, v, sub, c }: { t: string; v: number; sub?: string; c: string }) {
  return (
    <div className="rise card p-4">
      <p className="text-[.75rem] text-(--color-mut)">{t}</p>
      <b className="num mt-1 block text-2xl" style={{ color: c }}>{v.toLocaleString("en-US")}</b>
      <span className="text-[.68rem] text-(--color-mut)">{sub ?? "ريال"}</span>
    </div>
  );
}
