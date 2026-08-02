import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import seed from "@/data/seed.json";

type SeedNode = {
  key: string; title: string; kind: string; status: string;
  due_date?: string; note?: string; kids?: SeedNode[];
};

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "غير مسجل" }, { status: 401 });

  const { plan } = await req.json().catch(() => ({ plan: true }));

  const { data: existing } = await sb.from("areas").select("id").limit(1);
  if (existing && existing.length) return NextResponse.json({ ok: true, skipped: true });

  // ------------------------------------------------------------- الجوانب
  const areaRows = seed.areas.map((a: any, i: number) => ({
    user_id: user.id, slug: a.slug, name: a.name, color: a.color, icon: a.icon, sort: i,
  }));
  const { data: areas, error: aErr } = await sb.from("areas").insert(areaRows).select();
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 400 });

  await sb.from("profiles").upsert({
    id: user.id,
    full_name: user.user_metadata?.full_name ?? (seed as any).owner ?? null,
    horizon_from: (seed as any).horizon_from,
    horizon_to: (seed as any).horizon_to,
  });

  // الاتمتة الافتراضية شغالة كلها
  await sb.from("automations").upsert(
    ["daily_digest", "calendar_sync", "rollover", "weekly_review", "snapshot", "neglect_nudge"].map((k) => ({
      user_id: user.id, key: k, enabled: true,
    })),
    { onConflict: "user_id,key" }
  );

  if (!plan) return NextResponse.json({ ok: true, areas: areas?.length ?? 0, nodes: 0 });

  // -------------------------------------------------------- شجرة المهام
  let count = 0;
  const insertTree = async (list: SeedNode[], areaId: string, parent: string | null) => {
    let sort = 0;
    for (const n of list) {
      const { data, error } = await sb
        .from("nodes")
        .insert({
          user_id: user.id,
          area_id: areaId,
          parent_id: parent,
          kind: n.kind,
          status: n.status,
          title: n.title,
          note: n.note ?? null,
          due_date: n.due_date ?? null,
          sort: (sort += 10),
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      count++;
      if (n.kids?.length) await insertTree(n.kids, areaId, data.id);
    }
  };

  try {
    for (const a of seed.areas as any[]) {
      const area = areas!.find((x: any) => x.slug === a.slug);
      if (area) await insertTree(a.nodes, area.id, null);
    }
    // الانجازات السابقة
    const arch = (seed as any).archive ?? [];
    if (arch.length) {
      await sb.from("achievements").insert(
        arch.map((x: any) => ({
          user_id: user.id,
          title: x.title,
          note: x.note ?? x.date ?? null,
          happened_on: "2026-07-31",
          source: "manual",
        }))
      );
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, areas: areas?.length ?? 0, nodes: count });
}
