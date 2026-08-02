import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (code) {
    const sb = await supabaseServer();
    const { data, error } = await sb.auth.exchangeCodeForSession(code);

    if (!error && data?.session) {
      // نخزن توكن قوقل عشان مزامنة الكالندر تشتغل بالخلفية
      const s: any = data.session;
      if (s.provider_refresh_token || s.provider_token) {
        await sb.from("google_tokens").upsert({
          user_id: data.session.user.id,
          // ما نمسح الـ refresh token القديم لو قوقل ما ارسل واحد جديد
          ...(s.provider_refresh_token ? { refresh_token: s.provider_refresh_token } : {}),
          access_token: s.provider_token ?? null,
          expires_at: new Date(Date.now() + 3300 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/login?e=auth", url.origin));
}
