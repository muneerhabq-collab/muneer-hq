"use client";

import { useState } from "react";
import { Rocket, Loader2 } from "lucide-react";
import Logo from "./Logo";
import { useStore } from "./Store";

export default function Onboard() {
  const { reload, say } = useStore();
  const [busy, setBusy] = useState(false);

  const run = async (withPlan: boolean) => {
    setBusy(true);
    const r = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: withPlan }),
    });
    const j = await r.json();
    if (j.ok) { await reload(); say("جاهز. يلا نبدأ."); }
    else say(j.error ?? "صار خطأ");
    setBusy(false);
  };

  return (
    <div className="rise mx-auto max-w-[560px] py-10 text-center">
      <div className="mb-5 flex justify-center"><Logo size={56} withName={false} /></div>
      <h1 className="mb-2 text-2xl font-extrabold">اهلا فيك</h1>
      <p className="mb-7 text-sm leading-relaxed text-(--color-mut)">
        نجهز لك جوانب الحياة الست وشجرة المهام. تقدر تبدأ بخطتك الجاهزة (اغسطس - ديسمبر 2026)
        او تبدأ من صفر وتبني كل شي بنفسك.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => run(true)}
          disabled={busy}
          className="card flex flex-col items-center gap-2 p-5 text-center transition hover:bg-white/8 disabled:opacity-50"
        >
          {busy ? <Loader2 className="animate-spin" /> : <Rocket className="text-(--color-accent)" />}
          <b>ابدأ بخطتي الجاهزة</b>
          <span className="text-xs leading-relaxed text-(--color-mut)">
            6 جوانب + <span className="num">99</span> مهمة نهائية مرتبة بشجرة كاملة مع الديدلاينات
          </span>
        </button>

        <button
          onClick={() => run(false)}
          disabled={busy}
          className="card flex flex-col items-center gap-2 p-5 text-center transition hover:bg-white/8 disabled:opacity-50"
        >
          <b>ابدأ من صفر</b>
          <span className="text-xs leading-relaxed text-(--color-mut)">
            الجوانب الست بس، وانت تبني مهامك
          </span>
        </button>
      </div>
    </div>
  );
}
