"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import { Mail, ArrowLeft } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const site = typeof window !== "undefined" ? window.location.origin : "";

  const google = async () => {
    setBusy(true);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${site}/auth/callback`,
        scopes: "https://www.googleapis.com/auth/calendar",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) { setErr(error.message); setBusy(false); }
  };

  const magic = async () => {
    if (!email.trim()) return;
    setBusy(true); setErr("");
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${site}/auth/callback` },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  };

  return (
    <div className="grid min-h-screen place-items-center px-5">
      <div className="rise w-full max-w-[420px]">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <Logo size={54} withName />
          <p className="text-sm leading-relaxed text-(--color-mut)">
            نظام تشغيل الحياة. الاهداف والمشاريع والمهام والعادات والكالندر في مكان واحد.
          </p>
        </div>

        <div className="card p-5">
          <button
            onClick={google}
            disabled={busy}
            className="mb-3 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-white px-4 py-3 font-bold text-[#1F0F25] transition hover:brightness-95 disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.6 24.6c0-1.6-.2-3.2-.5-4.6H24v9.1h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-4 6.8-9.9 6.8-17.4z"/>
              <path fill="#FBBC05" d="M10.4 28.7a14.5 14.5 0 010-9.4l-7.8-6.1a24 24 0 000 21.6l7.8-6.1z"/>
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.9l-7.3-5.7c-2 1.4-4.7 2.3-8.6 2.3-6.3 0-11.7-3.7-13.6-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/>
            </svg>
            دخول بحساب قوقل
          </button>
          <p className="mb-4 text-center text-[.7rem] leading-relaxed text-(--color-mut)">
            قوقل يعطيك مزامنة الكالندر التلقائية. هذا الخيار الافضل.
          </p>

          <div className="mb-4 flex items-center gap-3 text-[.7rem] text-(--color-mut)">
            <span className="h-px flex-1 bg-white/12" /> او <span className="h-px flex-1 bg-white/12" />
          </div>

          {sent ? (
            <div className="rounded-2xl border border-(--color-mint)/30 bg-(--color-mint)/10 p-4 text-center text-sm">
              ارسلنا لك رابط دخول على <b dir="ltr" className="num">{email}</b>. افتحه من نفس المتصفح.
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && magic()}
                  placeholder="you@email.com"
                  className="w-full rounded-2xl border border-white/12 bg-black/25 px-4 py-3 text-sm outline-none focus:border-(--color-accent)/60"
                />
                <button
                  onClick={magic}
                  disabled={busy}
                  className="shrink-0 rounded-2xl border border-white/12 px-4 text-sm hover:bg-white/8 disabled:opacity-50"
                >
                  <Mail size={17} />
                </button>
              </div>
              <p className="mt-2 text-[.7rem] text-(--color-mut)">رابط دخول بدون كلمة سر.</p>
            </>
          )}

          {err && <p className="mt-3 text-sm text-rose-300">{err}</p>}
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[.7rem] text-(--color-mut)">
          بياناتك لك وحدك <ArrowLeft size={12} /> محمية بـ RLS على مستوى قاعدة البيانات
        </p>
      </div>
    </div>
  );
}
