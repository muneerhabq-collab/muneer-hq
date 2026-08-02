import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { syncUser } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

export async function POST() {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false, message: "سجل دخولك" }, { status: 401 });
  const res = await syncUser(sb, auth.user.id);
  return NextResponse.json(res);
}
