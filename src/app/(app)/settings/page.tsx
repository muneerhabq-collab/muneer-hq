"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/components/Store";
import { supabaseBrowser } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import type { Automation } from "@/lib/types";
import {
  Bot, CalendarCheck, Download, Image as ImageIcon, Loader2, RefreshCw,
  Save, ShieldAlert, Trash2, User,
} from "lucide-react";

const AUTOS: { key: string; name: string; desc: string }[] = [
  { key: "calendar_sync", name: "مزامنة الكالندر", desc: "كل ربع ساعة يرفع مهامك المجدولة لقوقل كالندر ويحدث اللي تغير" },
  { key: "daily_digest", name: "ملخص الصباح", desc: "كل يوم 7 صباحا يوصلك ايميل فيه مهام اليوم والمتاخر والعادات" },
  { key: "rollover", name: "ترحيل المتاخر", desc: "كل ليلة ينقل مهام امس اللي ما خلصت لليوم الجديد" },
  { key: "weekly_review", name: "تجهيز المراجعة", desc: "كل سبت يجهز لك مراجعة الاسبوع بالارقام جاهزة" },
  { key: "snapshot", name: "لقطة التقدم", desc: "كل اسبوع يحفظ نسبة كل جانب عشان تشوف منحنى تقدمك" },
  { key: "neglect_nudge", name: "تنبيه الاهمال", desc: "لو جانب مر عليه 10 ايام بدون حركة ينبهك" },
];

export default function Settings() {
  const { profile, saveProfile, say, areas, nodes, userId } = useStore();
  const sb = supabaseBrowser();

  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [tz, setTz] = useState("Asia/Riyadh");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [saving, setSaving] = useState(false);

  const [autos, setAutos] = useState<Automation[]>([]);
  const [gcal, setGcal] = useState<"loading" | "on" | "off">("loading");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    setName(profile?.full_name ?? "");
    setLogo(profile?.logo_url ?? "");
    setTz(profile?.timezone ?? "Asia/Riyadh");
    setFrom(profile?.horizon_from ?? "");
    setTo(profile?.horizon_to ?? "");
  }, [profile]);

  useEffect(() => {
    (async () => {
      const { data } = await sb.from("automations").select("*").order("key");
      setAutos((data as Automation[]) ?? []);
      const { data: g } = await sb.from("google_tokens").select("user_id").limit(1);
      setGcal(g && g.length ? "on" : "off");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setSaving(true);
    await saveProfile({
      full_name: name || null,
      logo_url: logo || null,
      timezone: tz || "Asia/Riyadh",
      horizon_from: from || null,
      horizon_to: to || null,
    });
    setSaving(false);
    say("انحفظت الاعدادات");
  }

  async function toggleAuto(a: Automation) {
    const next = !a.enabled;
    setAutos((x) => x.map((i) => (i.id === a.id ? { ...i, enabled: next } : i)));
    const { error } = await sb.from("automations").update({ enabled: next }).eq("id", a.id);
    if (error) {
      setAutos((x) => x.map((i) => (i.id === a.id ? { ...i, enabled: !next } : i)));
      say("ما قدرت اغير الاوتوميشن");
    }
  }

  async function ensureAutos() {
    const have = new Set(autos.map((a) => a.key));
    const missing = AUTOS.filter((a) => !have.has(a.key)).map((a) => ({
      user_id: userId, key: a.key, enabled: true, config: {},
    }));
    if (!missing.length) return say("كل الاوتوميشنات موجودة");
    await sb.from("automations").insert(missing);
    const { data } = await sb.from("automations").select("*").order("key");
    setAutos((data as Automation[]) ?? []);
    say("فعلت " + missing.length + " اوتوميشن");
  }

  async function connectGoogle() {
    const site = window.location.origin;
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: site + "/auth/callback?next=/settings",
        scopes: "https://www.googleapis.com/auth/calendar",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  }

  async function disconnectGoogle() {
    await sb.from("google_tokens").delete().eq("user_id", userId);
    setGcal("off");
    say("فصلت قوقل كالندر");
  }

  async function run(job: string, label: string) {
    setBusy(job);
    try {
      const r = await fetch("/api/calendar/" + job, { method: "POST" });
      const j = await r.json();
      say(j.message || label);
    } catch {
      say("صار خطا، تاكد ان قوقل مربوط");
    }
    setBusy("");
  }

  const stats = {
    areas: areas.length,
    nodes: nodes.length,
    done: nodes.filter((n) => n.status === "done").length,
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center gap-3">
        <Logo url={logo || profile?.logo_url || undefined} size={30} withName={false} />
        <div>
          <h1 className="text-xl font-bold">الاعدادات</h1>
          <p className="text-sm text-(--color-mut)">هويتك، مداك الزمني، والاوتوميشن</p>
        </div>
      </header>

      <section className="card mb-4 p-4">
        <h2 className="mb-3 flex items-center gap-2 font-bold"><User size={16} /> الملف الشخصي</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-(--color-mut)">الاسم</span>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-(--color-line) bg-(--color-panel2) px-3 py-2 text-sm outline-none focus:border-(--color-accent)" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-(--color-mut)">المنطقة الزمنية</span>
            <input value={tz} onChange={(e) => setTz(e.target.value)} dir="ltr"
              className="w-full rounded-xl border border-(--color-line) bg-(--color-panel2) px-3 py-2 text-sm outline-none focus:border-(--color-accent)" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 flex items-center gap-1 text-xs text-(--color-mut)">
              <ImageIcon size={12} /> رابط اللوقو
            </span>
            <input value={logo} onChange={(e) => setLogo(e.target.value)} dir="ltr" placeholder="/logo.png"
              className="num w-full rounded-xl border border-(--color-line) bg-(--color-panel2) px-3 py-2 text-sm outline-none focus:border-(--color-accent)" />
            <span className="mt-1 block text-xs text-(--color-mut)">
              خله فاضي عشان يستخدم لوقو منير الاصلي public/logo.png، او حط رابط صورة لوقو ثاني
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-(--color-mut)">بداية المدى</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="num w-full rounded-xl border border-(--color-line) bg-(--color-panel2) px-3 py-2 text-sm outline-none focus:border-(--color-accent)" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-(--color-mut)">نهاية المدى</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="num w-full rounded-xl border border-(--color-line) bg-(--color-panel2) px-3 py-2 text-sm outline-none focus:border-(--color-accent)" />
          </label>
        </div>
        <button onClick={save} disabled={saving}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-(--color-accent) px-4 py-2 text-sm font-bold text-[#1b0f22] disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} احفظ
        </button>
      </section>

      <section className="card mb-4 p-4">
        <h2 className="mb-3 flex items-center gap-2 font-bold"><CalendarCheck size={16} /> قوقل كالندر</h2>
        {gcal === "loading" ? (
          <p className="text-sm text-(--color-mut)">جاري التحقق</p>
        ) : gcal === "on" ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-(--color-mint)/15 text-(--color-mint)">مربوط</span>
            <button onClick={() => run("sync", "تمت المزامنة")} disabled={busy === "sync"}
              className="chip border border-(--color-line) hover:border-(--color-accent)">
              {busy === "sync" ? "..." : "زامن الحين"}
            </button>
            <button onClick={() => run("autoplan", "جدولت اسبوعك")} disabled={busy === "autoplan"}
              className="chip border border-(--color-line) hover:border-(--color-accent)">
              {busy === "autoplan" ? "..." : "جدول اسبوعي تلقائي"}
            </button>
            <button onClick={disconnectGoogle} className="chip text-(--color-rose)">افصل</button>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-sm text-(--color-mut)">
              اربط كالندرك عشان المهام تنحجز بوقتها تلقائي وترجع لك التغييرات
            </p>
            <button onClick={connectGoogle}
              className="rounded-xl bg-(--color-accent) px-4 py-2 text-sm font-bold text-[#1b0f22]">
              اربط قوقل كالندر
            </button>
          </div>
        )}
      </section>

      <section className="card mb-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold"><Bot size={16} /> الاوتوميشن</h2>
          <button onClick={ensureAutos} className="chip border border-(--color-line) hover:border-(--color-accent)">
            <RefreshCw size={12} /> فعل الكل
          </button>
        </div>
        <div className="grid gap-2">
          {AUTOS.map((a) => {
            const row = autos.find((x) => x.key === a.key);
            const on = row?.enabled ?? false;
            return (
              <div key={a.key} className="flex items-start justify-between gap-3 rounded-xl border border-(--color-line) bg-(--color-panel2) p-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold">{a.name}</div>
                  <div className="text-xs text-(--color-mut)">{a.desc}</div>
                  {row?.last_run && (
                    <div className="mt-1 text-[11px] text-(--color-mut)">اخر تشغيل <bdi className="num">{row.last_run.slice(0, 16).replace("T", " ")}</bdi></div>
                  )}
                </div>
                <button
                  onClick={() => row && toggleAuto(row)}
                  disabled={!row}
                  className={
                    "mt-1 h-6 w-11 shrink-0 rounded-full transition " +
                    (on ? "bg-(--color-accent)" : "bg-(--color-line)")
                  }
                  aria-label={a.name}
                >
                  <span className={"block h-5 w-5 rounded-full bg-white transition " + (on ? "mr-[22px]" : "mr-0.5")} />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card mb-4 p-4">
        <h2 className="mb-3 flex items-center gap-2 font-bold"><Download size={16} /> بياناتك</h2>
        <p className="mb-3 text-sm text-(--color-mut)">
          <bdi className="num">{stats.areas}</bdi> جوانب، <bdi className="num">{stats.nodes}</bdi> عنصر، <bdi className="num">{stats.done}</bdi> خلصت
        </p>
        <a href="/api/export" download
          className="inline-flex items-center gap-2 rounded-xl border border-(--color-line) px-4 py-2 text-sm hover:border-(--color-accent)">
          <Download size={15} /> نزل نسخة احتياطية JSON
        </a>
      </section>

      <section className="card border-(--color-rose)/30 p-4">
        <h2 className="mb-2 flex items-center gap-2 font-bold text-(--color-rose)">
          <ShieldAlert size={16} /> منطقة الخطر
        </h2>
        <p className="mb-3 text-sm text-(--color-mut)">
          مسح كل المهام والجوانب. ما ينمسح لا الانجازات ولا الفلوس ولا القياسات. ما فيه رجعة.
        </p>
        <button
          onClick={async () => {
            const ok = window.prompt("اكتب: امسح — عشان اتاكد");
            if (ok !== "امسح") return;
            await sb.from("nodes").delete().eq("user_id", userId);
            await sb.from("areas").delete().eq("user_id", userId);
            say("انمسحت، حدث الصفحة");
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-(--color-rose)/40 px-4 py-2 text-sm text-(--color-rose) hover:bg-(--color-rose)/10"
        >
          <Trash2 size={15} /> امسح كل المهام والجوانب
        </button>
      </section>
    </div>
  );
}
