import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { autoplan } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false, message: "سجل دخولك" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const days = Number(body?.days ?? 7);
  const res = await autoplan(sb, auth.user.id, days);
  return NextResponse.json(res);
}
