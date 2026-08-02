import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "غير مسجل" }, { status: 401 });

  const tables = ["areas", "nodes", "habit_logs", "metrics", "ledger", "achievements", "reviews", "progress_snapshots"];
  const out: Record<string, unknown> = { exported_at: new Date().toISOString() };
  for (const t of tables) {
    const { data } = await sb.from(t).select("*");
    out[t] = data ?? [];
  }
  const { data: p } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
  out.profile = p ?? null;

  return new NextResponse(JSON.stringify(out, null, 1), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="life-os-backup.json"`,
    },
  });
}
