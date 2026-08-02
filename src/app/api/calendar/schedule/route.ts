import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { scheduleNode } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false, message: "سجل دخولك" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const nodeId = body?.node_id;
  if (!nodeId) return NextResponse.json({ ok: false, message: "ناقص node_id" }, { status: 400 });

  const res = await scheduleNode(sb, auth.user.id, nodeId);
  return NextResponse.json(res);
}
