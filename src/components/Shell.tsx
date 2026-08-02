"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutGrid, CalendarCheck, Repeat, Wallet, Activity, Trophy,
  ClipboardCheck, Settings, Menu, X, Search, Plus, LogOut, CalendarDays,
} from "lucide-react";
import Logo from "./Logo";
import Toasts from "./Toasts";
import CommandPalette from "./CommandPalette";
import QuickAdd from "./QuickAdd";
import { useStore } from "./Store";
import { supabaseBrowser } from "@/lib/supabase/client";

const NAV = [
  { href: "/", label: "الرئيسية", icon: LayoutGrid },
  { href: "/today", label: "اليوم", icon: CalendarCheck },
  { href: "/calendar", label: "الاسبوع", icon: CalendarDays },
  { href: "/habits", label: "العادات", icon: Repeat },
  { href: "/tracker", label: "المتابعة", icon: Activity },
  { href: "/money", label: "المالي", icon: Wallet },
  { href: "/review", label: "المراجعة", icon: ClipboardCheck },
  { href: "/archive", label: "الانجازات", icon: Trophy },
  { href: "/settings", label: "الاعدادات", icon: Settings },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { areas, profile, tree } = useStore();
  const [open, setOpen] = useState(false);
  const [pal, setPal] = useState(false);
  const [add, setAdd] = useState(false);

  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPal(true); }
      else if (!typing && e.key === "n") { e.preventDefault(); setAdd(true); }
      else if (!typing && e.key === "/") { e.preventDefault(); setPal(true); }
      else if (e.key === "Escape") { setPal(false); setAdd(false); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // مزامنة الكالندر عند فتح التطبيق (بحد اقصى مرة كل 10 دقائق)
  // فايدتها انك حتى على خطة Vercel المجانية يبقى كالندرك محدث لحظة ما تفتح
  useEffect(() => {
    if (!profile) return;
    let stop = false;
    const KEY = "hq_last_cal_sync";
    const run = () => {
      if (stop || document.visibilityState !== "visible") return;
      const last = Number(localStorage.getItem(KEY) || 0);
      if (Date.now() - last < 10 * 60 * 1000) return;
      localStorage.setItem(KEY, String(Date.now()));
      fetch("/api/calendar/sync", { method: "POST" }).catch(() => {});
    };
    run();
    const t = setInterval(run, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", run);
    return () => { stop = true; clearInterval(t); document.removeEventListener("visibilitychange", run); };
  }, [profile]);

  const logout = async () => {
    await supabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const Side = (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className="px-2 pb-4 pt-1">
        <Logo url={profile?.logo_url} />
      </div>

      <button
        onClick={() => setAdd(true)}
        className="mb-2 flex items-center justify-center gap-2 rounded-2xl bg-(--color-accent) px-3 py-2.5 text-sm font-bold text-[#1F0F25] transition hover:brightness-110 active:scale-[.98]"
      >
        <Plus size={17} /> اضافة سريعة
        <kbd className="num rounded bg-black/15 px-1.5 text-[.65rem]">N</kbd>
      </button>
      <button
        onClick={() => setPal(true)}
        className="mb-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-(--color-mut) transition hover:bg-white/10"
      >
        <Search size={16} /> بحث وامر
        <kbd className="num mr-auto rounded bg-white/10 px-1.5 text-[.65rem]">⌘K</kbd>
      </button>

      {NAV.slice(0, 3).map((n) => (
        <NavLink key={n.href} {...n} active={path === n.href} />
      ))}

      <div className="mt-3 mb-1 px-3 text-[.68rem] font-bold tracking-wide text-(--color-mut)">
        جوانب الحياة
      </div>
      {areas.map((a) => {
        const t = tree.get(a.id) ?? [];
        const total = t.length;
        return (
          <Link
            key={a.id}
            href={`/area/${a.slug}`}
            className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
              path === `/area/${a.slug}` ? "bg-white/10 font-bold" : "hover:bg-white/6"
            }`}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: a.color }} />
            <span className="truncate">{a.name}</span>
            <span className="num mr-auto text-[.7rem] text-(--color-mut)">{total}</span>
          </Link>
        );
      })}

      <div className="mt-3 mb-1 px-3 text-[.68rem] font-bold tracking-wide text-(--color-mut)">
        ادوات
      </div>
      {NAV.slice(3).map((n) => (
        <NavLink key={n.href} {...n} active={path === n.href} />
      ))}

      <button
        onClick={logout}
        className="mt-auto flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-(--color-mut) transition hover:bg-white/6 hover:text-(--color-txt)"
      >
        <LogOut size={17} /> خروج
      </button>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* الجانب - سطح المكتب */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 border-l border-white/8 bg-black/15 lg:block">
        {Side}
      </aside>

      {/* الجانب - الجوال */}
      {open && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="slidein absolute inset-y-0 right-0 w-[80vw] max-w-[290px] border-l border-white/10 bg-[#241329] shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute left-3 top-3 rounded-lg p-1.5 text-(--color-mut) hover:bg-white/10"
            >
              <X size={18} />
            </button>
            {Side}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/8 bg-[#1F0F25]/80 px-4 py-3 backdrop-blur-xl lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 hover:bg-white/10">
            <Menu size={20} />
          </button>
          <Logo size={24} url={profile?.logo_url} withName={false} />
          <button onClick={() => setAdd(true)} className="mr-auto rounded-xl bg-(--color-accent) p-2 text-[#1F0F25]">
            <Plus size={18} />
          </button>
          <button onClick={() => setPal(true)} className="rounded-xl border border-white/10 p-2">
            <Search size={18} />
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-24 pt-5 sm:px-6">{children}</main>
      </div>

      {pal && <CommandPalette onClose={() => setPal(false)} openAdd={() => { setPal(false); setAdd(true); }} />}
      {add && <QuickAdd onClose={() => setAdd(false)} />}
      <Toasts />
    </div>
  );
}

function NavLink({ href, label, icon: Icon, active }: any) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
        active ? "bg-(--color-accent)/18 font-bold text-(--color-accent)" : "hover:bg-white/6"
      }`}
    >
      <Icon size={17} /> {label}
    </Link>
  );
}
