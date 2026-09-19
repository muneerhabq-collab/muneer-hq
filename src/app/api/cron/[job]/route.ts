import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { syncUser } from "@/lib/scheduler";
import { addDays, fmtDate, todayISO, weekStart } from "@/lib/dates";
import type { Area, TNode } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type SB = ReturnType<typeof supabaseAdmin>;

const JOBS = [
  "calendar_sync", "daily_digest", "rollover", "weekly_review", "snapshot", "neglect_nudge",
] as const;
type Job = (typeof JOBS)[number];

function authed(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // بيئة تطوير
  const h = req.headers.get("authorization") ?? "";
  const q = new URL(req.url).searchParams.get("key") ?? "";
  return h === `Bearer ${secret}` || q === secret;
}

/** كل المستخدمين اللي مفعلين هذا الاوتوميشن */
async function usersFor(sb: SB, key: Job): Promise<string[]> {
  const { data } = await sb.from("automations").select("user_id").eq("key", key).eq("enabled", true);
  return [...new Set(((data as { user_id: string }[]) ?? []).map((r) => r.user_id))];
}

async function stamp(sb: SB, key: Job, userId: string, ok: boolean, message: string) {
  await sb.from("automations").update({ last_run: new Date().toISOString() }).eq("user_id", userId).eq("key", key);
  await sb.from("automation_logs").insert({ user_id: userId, key, status: ok ? "ok" : "fail", detail: message });
}

/* ------------------------------- الوظائف ------------------------------- */

async function jobCalendarSync(sb: SB) {
  const users = await usersFor(sb, "calendar_sync");
  let n = 0;
  for (const u of users) {
    const r = await syncUser(sb, u);
    await stamp(sb, "calendar_sync", u, !!r.ok, r.message ?? "");
    if (r.ok) n++;
  }
  return { users: users.length, synced: n };
}

/** كم يوم يرجع الترحيل للخلف. اللي اقدم من كذا يظل متأخر عشان يبين على حقيقته. */
const ROLLOVER_WINDOW_DAYS = 7;

async function jobRollover(sb: SB) {
  const users = await usersFor(sb, "rollover");
  const today = todayISO();
  const floor = addDays(today, -ROLLOVER_WINDOW_DAYS);
  let moved = 0;
  for (const u of users) {
    const { data } = await sb
      .from("nodes")
      .select("id")
      .eq("user_id", u)
      .in("status", ["todo", "doing"])
      .lt("due_date", today)
      .gte("due_date", floor)
      .not("due_date", "is", null);
    const ids = ((data as { id: string }[]) ?? []).map((r) => r.id);
    if (ids.length) {
      await sb.from("nodes").update({ due_date: today }).in("id", ids);
      moved += ids.length;
    }
    await stamp(sb, "rollover", u, true, `رحلت ${ids.length} مهمة (نافذة ${ROLLOVER_WINDOW_DAYS} ايام)`);
  }
  return { moved };
}

async function jobSnapshot(sb: SB) {
  const users = await usersFor(sb, "snapshot");
  const day = todayISO();
  let saved = 0;
  for (const u of users) {
    const { data } = await sb.rpc("area_progress", { p_user: u });
    const rows = (data as { area_id: string; done_leaves: number; total_leaves: number; pct: number }[]) ?? [];
    const done = rows.reduce((a, r) => a + Number(r.done_leaves ?? 0), 0);
    const total = rows.reduce((a, r) => a + Number(r.total_leaves ?? 0), 0);
    const overall = total ? Math.round((100 * done) / total) : 0;
    const byArea: Record<string, number> = {};
    rows.forEach((r) => (byArea[r.area_id] = Number(r.pct ?? 0)));
    await sb.from("progress_snapshots").upsert(
      { user_id: u, taken_on: day, overall, by_area: byArea },
      { onConflict: "user_id,taken_on" }
    );
    saved++;
    await stamp(sb, "snapshot", u, true, `حفظت لقطة ${overall}%`);
  }
  return { saved };
}

async function jobWeeklyReview(sb: SB) {
  const users = await usersFor(sb, "weekly_review");
  const wk = weekStart(todayISO());
  const prev = addDays(wk, -7);
  let made = 0;
  for (const u of users) {
    const { data: exists } = await sb
      .from("reviews").select("id").eq("user_id", u).eq("week_start", prev).maybeSingle();
    if (exists) continue;

    const { data: doneRows } = await sb
      .from("nodes").select("id,title,area_id")
      .eq("user_id", u).eq("status", "done")
      .gte("done_at", prev).lt("done_at", wk);
    const { data: missed } = await sb
      .from("nodes").select("id")
      .eq("user_id", u).in("status", ["todo", "doing"])
      .gte("due_date", prev).lt("due_date", wk);
    const { data: prog } = await sb.rpc("area_progress", { p_user: u });

    await sb.from("reviews").insert({
      user_id: u,
      week_start: prev,
      constraints: {},
      snapshot: {
        done: (doneRows ?? []).length,
        missed: (missed ?? []).length,
        areas: prog ?? [],
      },
    });
    made++;
    await stamp(sb, "weekly_review", u, true, "جهزت مراجعة الاسبوع");
  }
  return { made };
}

async function jobNeglect(sb: SB) {
  const users = await usersFor(sb, "neglect_nudge");
  const cut = addDays(todayISO(), -10);
  const out: Record<string, string[]> = {};
  for (const u of users) {
    const { data: areas } = await sb.from("areas").select("id,name").eq("user_id", u);
    const cold: string[] = [];
    for (const a of ((areas as Area[]) ?? [])) {
      const { count } = await sb
        .from("nodes").select("id", { count: "exact", head: true })
        .eq("user_id", u).eq("area_id", a.id).gte("updated_at", cut);
      if (!count) cold.push(a.name);
    }
    out[u] = cold;
    if (cold.length) {
      await sb.from("automation_logs").insert({
        user_id: u, key: "neglect_nudge", status: "ok",
        detail: "جوانب مهملة: " + cold.join("، "),
      });
    }
    await stamp(sb, "neglect_nudge", u, true, cold.length ? cold.join("، ") : "كل الجوانب متحركة");
  }
  return { out };
}

/* ------------------------------ ملخص الصباح ------------------------------ */

function digestHTML(o: {
  name: string; today: string; overdue: TNode[]; due: TNode[]; doing: TNode[];
  habits: { title: string; done: boolean }[]; areas: { name: string; pct: number }[]; daysLeft: number | null;
}) {
  const li = (n: TNode) =>
    `<li style="margin:4px 0">${esc(n.title)}${n.due_date ? ` <span style="color:#B98CE6;direction:ltr;display:inline-block">${n.due_date}</span>` : ""}</li>`;
  const block = (title: string, items: string) =>
    items ? `<h3 style="margin:18px 0 6px;font-size:15px;color:#E8DFF2">${title}</h3><ul style="margin:0;padding-right:18px;color:#C9BDD6;font-size:14px">${items}</ul>` : "";

  const bars = o.areas
    .map(
      (a) =>
        `<tr><td style="padding:3px 0;font-size:13px;color:#C9BDD6">${esc(a.name)}</td>
         <td style="width:160px;padding:3px 0"><div style="background:#3A2A44;border-radius:8px;height:8px"><div style="background:#B98CE6;height:8px;border-radius:8px;width:${a.pct}%"></div></div></td>
         <td style="padding:3px 0 3px 8px;font-size:13px;color:#B98CE6;direction:ltr">${a.pct}%</td></tr>`
    )
    .join("");

  return `<!doctype html><html dir="rtl" lang="ar"><body style="margin:0;background:#1F0F25;font-family:Tajawal,Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:linear-gradient(160deg,#341A3C,#1F0F25);border:1px solid #3A2A44;border-radius:20px;padding:24px">
      <h1 style="margin:0 0 4px;color:#F3ECF8;font-size:20px">صباح الخير ${esc(o.name)}</h1>
      <p style="margin:0;color:#9C8CA8;font-size:13px;direction:ltr;display:inline-block">${o.today}</p>
      ${o.daysLeft !== null ? `<p style="margin:8px 0 0;color:#C9BDD6;font-size:13px">باقي <b style="color:#B98CE6;direction:ltr;display:inline-block">${o.daysLeft}</b> يوم على نهاية مداك</p>` : ""}
      ${block("متاخرة عليك", o.overdue.map(li).join(""))}
      ${block("مستحقة اليوم", o.due.map(li).join(""))}
      ${block("شغال عليها", o.doing.map(li).join(""))}
      ${o.habits.length ? `<h3 style="margin:18px 0 6px;font-size:15px;color:#E8DFF2">عاداتك</h3><p style="margin:0;color:#C9BDD6;font-size:14px">${o.habits.map((h) => (h.done ? "✓ " : "○ ") + esc(h.title)).join(" &nbsp;·&nbsp; ")}</p>` : ""}
      ${bars ? `<h3 style="margin:18px 0 6px;font-size:15px;color:#E8DFF2">تقدم الجوانب</h3><table style="width:100%;border-collapse:collapse">${bars}</table>` : ""}
      <p style="margin:22px 0 0"><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "#"}/today" style="background:#B98CE6;color:#1b0f22;text-decoration:none;padding:10px 18px;border-radius:12px;font-weight:700;font-size:14px">افتح يومك</a></p>
    </div>
    <p style="text-align:center;color:#6B5C77;font-size:11px;margin-top:14px">منير HQ</p>
  </div></body></html>`;
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

async function jobDigest(sb: SB) {
  const users = await usersFor(sb, "daily_digest");
  const today = todayISO();
  let sent = 0;

  for (const u of users) {
    const { data: prof } = await sb
      .from("profiles").select("full_name,horizon_to,settings").eq("id", u).maybeSingle();
    const p = prof as { full_name: string | null; horizon_to: string | null; settings: Record<string, unknown> } | null;

    const { data: nodesRaw } = await sb
      .from("nodes").select("*").eq("user_id", u).in("status", ["todo", "doing"]);
    const nodes = (nodesRaw as TNode[]) ?? [];
    const parents = new Set(nodes.map((n) => n.parent_id).filter(Boolean) as string[]);
    const leaf = nodes.filter((n) => !parents.has(n.id) && n.kind !== "habit");

    const overdue = leaf.filter((n) => n.due_date && n.due_date < today).slice(0, 12);
    const due = leaf.filter((n) => n.due_date === today).slice(0, 12);
    const doing = leaf.filter((n) => n.status === "doing" && n.due_date !== today && !(n.due_date && n.due_date < today)).slice(0, 8);

    const habitNodes = nodes.filter((n) => n.kind === "habit");
    const { data: logs } = await sb
      .from("habit_logs").select("node_id,done").eq("user_id", u).eq("log_date", today);
    const doneSet = new Set(((logs as { node_id: string; done: boolean }[]) ?? []).filter((l) => l.done).map((l) => l.node_id));
    const habits = habitNodes.map((h) => ({ title: h.title, done: doneSet.has(h.id) }));

    const { data: areas } = await sb.from("areas").select("id,name").eq("user_id", u);
    const { data: prog } = await sb.rpc("area_progress", { p_user: u });
    const pmap = new Map(((prog as { area_id: string; pct: number }[]) ?? []).map((r) => [r.area_id, Number(r.pct)]));
    const areaBars = ((areas as Area[]) ?? []).map((a) => ({ name: a.name, pct: pmap.get(a.id) ?? 0 }));

    if (!overdue.length && !due.length && !doing.length && !habits.length) {
      await stamp(sb, "daily_digest", u, true, "ما فيه شي يستاهل ايميل");
      continue;
    }

    const daysLeft = p?.horizon_to
      ? Math.round((new Date(p.horizon_to + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86400000)
      : null;

    const html = digestHTML({
      name: p?.full_name ?? "",
      today: fmtDate(today),
      overdue, due, doing, habits, areas: areaBars, daysLeft,
    });

    const to = (p?.settings as { digest_email?: string } | null)?.digest_email || process.env.DIGEST_TO_EMAIL;
    const key = process.env.RESEND_API_KEY;
    if (!key || !to) {
      await stamp(sb, "daily_digest", u, false, "ناقص RESEND_API_KEY او الايميل");
      continue;
    }
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.DIGEST_FROM_EMAIL ?? "onboarding@resend.dev",
        to: [to],
        subject: `يومك · ${due.length} مستحقة${overdue.length ? ` و ${overdue.length} متاخرة` : ""}`,
        html,
      }),
    });
    const ok = r.ok;
    if (ok) sent++;
    await stamp(sb, "daily_digest", u, ok, ok ? "انرسل" : "فشل الارسال " + r.status);
  }
  return { sent };
}

/* -------------------------------- الراوت -------------------------------- */

async function run(job: string) {
  const sb = supabaseAdmin();
  switch (job as Job) {
    case "calendar_sync": return jobCalendarSync(sb);
    case "daily_digest": return jobDigest(sb);
    case "rollover": return jobRollover(sb);
    case "weekly_review": return jobWeeklyReview(sb);
    case "snapshot": return jobSnapshot(sb);
    case "neglect_nudge": return jobNeglect(sb);
    default: return null;
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ job: string }> }) {
  if (!authed(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { job } = await ctx.params;
  if (!JOBS.includes(job as Job)) return NextResponse.json({ ok: false, error: "unknown job" }, { status: 404 });
  try {
    const res = await run(job);
    return NextResponse.json({ ok: true, job, res });
  } catch (e) {
    return NextResponse.json({ ok: false, job, error: String(e) }, { status: 500 });
  }
}

export const POST = GET;
