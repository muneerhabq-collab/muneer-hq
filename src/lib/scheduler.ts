import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteEvent, freeSlots, listEvents, upsertEvent, validAccess, type GTokens } from "./google";
import { addDays, todayISO, weekStart } from "./dates";
import type { TNode } from "./types";

const OFF = "+03:00"; // الرياض بدون توقيت صيفي

export function dayISO(date: string, hhmm: string) {
  return `${date}T${hhmm}:00${OFF}`;
}

export type WorkWindow = { startHour: number; endHour: number; minMinutes: number };

export function windowOf(settings: Record<string, unknown> | null | undefined): WorkWindow {
  const s = (settings ?? {}) as Record<string, number>;
  return {
    startHour: Number(s.work_start ?? 9),
    endHour: Number(s.work_end ?? 22),
    minMinutes: Number(s.min_slot ?? 30),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** يجيب توكن قوقل صالح لهذا المستخدم مع دالة حفظ التجديد */
export async function accessFor(
  sb: SupabaseClient,
  userId: string
): Promise<{ access: string; calendarId: string } | null> {
  const { data } = await sb.from("google_tokens").select("*").eq("user_id", userId).maybeSingle();
  if (!data) return null;
  const tok = data as GTokens;
  const access = await validAccess(tok, async (t) => {
    await sb.from("google_tokens").update(t).eq("user_id", userId);
  });
  if (!access) return null;
  return { access, calendarId: tok.calendar_id || "primary" };
}

/** يرفع المهام المجدولة للكالندر ويحدث/يحذف اللي تغير. يرجع عدد العمليات */
export async function pushToCalendar(sb: SupabaseClient, userId: string) {
  const gate = await accessFor(sb, userId);
  if (!gate) return { ok: false, pushed: 0, removed: 0, message: "قوقل كالندر مو مربوط" };

  const from = todayISO();
  const to = addDays(from, 30);

  const { data } = await sb
    .from("nodes")
    .select("*")
    .eq("user_id", userId)
    .not("scheduled_start", "is", null)
    .gte("scheduled_start", from)
    .lte("scheduled_start", to + "T23:59:59");

  const rows = (data as TNode[]) ?? [];
  let pushed = 0;
  let removed = 0;

  for (const n of rows) {
    // خلصت او انلغت: نشيل الحدث
    if (n.status === "done" || n.status === "dropped") {
      if (n.calendar_event_id) {
        await deleteEvent(gate.access, gate.calendarId, n.calendar_event_id);
        await sb.from("nodes").update({ calendar_event_id: null, calendar_synced_at: new Date().toISOString() }).eq("id", n.id);
        removed++;
      }
      continue;
    }
    if (!n.scheduled_start || !n.scheduled_end) continue;
    // مزامن ومحدث؟ نتخطى
    if (n.calendar_event_id && n.calendar_synced_at && n.calendar_synced_at >= n.updated_at) continue;

    const id = await upsertEvent(
      gate.access,
      gate.calendarId,
      {
        summary: n.title,
        description: (n.note ?? "") + "\n\nمن منير HQ",
        start: n.scheduled_start,
        end: n.scheduled_end,
      },
      n.calendar_event_id
    );
    if (id) {
      await sb
        .from("nodes")
        .update({ calendar_event_id: id, calendar_synced_at: new Date().toISOString() })
        .eq("id", n.id);
      pushed++;
    }
  }
  return { ok: true, pushed, removed, message: `رفعت ${pushed} وشلت ${removed}` };
}

/** يسحب تغييرات الاوقات من قوقل لاحداث منير HQ */
export async function pullFromCalendar(sb: SupabaseClient, userId: string) {
  const gate = await accessFor(sb, userId);
  if (!gate) return { ok: false, updated: 0 };

  const from = dayISO(todayISO(), "00:00");
  const to = dayISO(addDays(todayISO(), 30), "23:59");
  const events = await listEvents(gate.access, gate.calendarId, from, to);
  const mine = events.filter((e) => e.lifeos);
  if (!mine.length) return { ok: true, updated: 0 };

  const { data } = await sb
    .from("nodes")
    .select("id,calendar_event_id,scheduled_start,scheduled_end")
    .eq("user_id", userId)
    .in("calendar_event_id", mine.map((e) => e.id));

  let updated = 0;
  for (const row of (data as TNode[]) ?? []) {
    const ev = mine.find((e) => e.id === row.calendar_event_id);
    if (!ev) continue;
    const changed =
      new Date(ev.start).getTime() !== new Date(row.scheduled_start ?? 0).getTime() ||
      new Date(ev.end).getTime() !== new Date(row.scheduled_end ?? 0).getTime();
    if (!changed) continue;
    await sb
      .from("nodes")
      .update({
        scheduled_start: ev.start,
        scheduled_end: ev.end,
        due_date: ev.start.slice(0, 10),
        calendar_synced_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    updated++;
  }
  return { ok: true, updated };
}

export async function syncUser(sb: SupabaseClient, userId: string) {
  const push = await pushToCalendar(sb, userId);
  if (!push.ok) return push;
  const pull = await pullFromCalendar(sb, userId);
  return {
    ok: true,
    pushed: push.pushed,
    removed: push.removed,
    updated: pull.updated,
    message: `رفعت ${push.pushed} مهمة، حدثت ${pull.updated} من الكالندر`,
  };
}

/** يحجز مهمة واحدة باقرب فراغ مناسب */
export async function scheduleNode(sb: SupabaseClient, userId: string, nodeId: string) {
  const gate = await accessFor(sb, userId);
  if (!gate) return { ok: false, message: "اربط قوقل كالندر من الاعدادات اول" };

  const { data: nodeRow } = await sb.from("nodes").select("*").eq("id", nodeId).maybeSingle();
  const n = nodeRow as TNode | null;
  if (!n) return { ok: false, message: "ما لقيت المهمة" };

  const { data: prof } = await sb.from("profiles").select("settings").eq("id", userId).maybeSingle();
  const w = windowOf((prof as { settings?: Record<string, unknown> } | null)?.settings);
  const need = Math.max(15, n.estimate_min ?? 45);

  const startDay = n.start_date && n.start_date > todayISO() ? n.start_date : todayISO();
  const lastDay = n.due_date && n.due_date >= startDay ? n.due_date : addDays(startDay, 7);

  for (let d = startDay; d <= lastDay; d = addDays(d, 1)) {
    const ds = dayISO(d, `${pad(w.startHour)}:00`);
    const de = dayISO(d, `${pad(w.endHour)}:00`);
    if (new Date(de).getTime() < Date.now() + 15 * 60000) continue;
    const busy = await listEvents(gate.access, gate.calendarId, ds, de);
    const slots = freeSlots(busy, ds, de, need);
    const slot = slots.find((s) => new Date(s.start).getTime() > Date.now() + 10 * 60000 || new Date(s.end).getTime() - Date.now() > need * 60000);
    if (!slot) continue;
    const startMs = Math.max(new Date(slot.start).getTime(), Date.now() + 10 * 60000);
    const start = new Date(startMs).toISOString();
    const end = new Date(startMs + need * 60000).toISOString();
    if (new Date(end).getTime() > new Date(slot.end).getTime()) continue;

    const evId = await upsertEvent(
      gate.access,
      gate.calendarId,
      { summary: n.title, description: (n.note ?? "") + "\n\nمن منير HQ", start, end },
      n.calendar_event_id
    );
    await sb
      .from("nodes")
      .update({
        scheduled_start: start,
        scheduled_end: end,
        due_date: n.due_date ?? d,
        auto_scheduled: true,
        calendar_event_id: evId,
        calendar_synced_at: new Date().toISOString(),
      })
      .eq("id", n.id);
    return { ok: true, when: start, message: "حجزتها بالكالندر" };
  }
  return { ok: false, message: "ما لقيت فراغ مناسب، وسع المدى او قصر الوقت المقدر" };
}

/** يوزع مهام الاسبوع على الفراغات، الاهم والاقرب اولا */
export async function autoplan(sb: SupabaseClient, userId: string, days = 7) {
  const gate = await accessFor(sb, userId);
  if (!gate) return { ok: false, planned: 0, message: "قوقل كالندر مو مربوط" };

  const { data: prof } = await sb.from("profiles").select("settings").eq("id", userId).maybeSingle();
  const w = windowOf((prof as { settings?: Record<string, unknown> } | null)?.settings);

  const start = todayISO();
  const end = addDays(start, days - 1);

  const { data } = await sb
    .from("nodes")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["todo", "doing"])
    .is("scheduled_start", null)
    .not("due_date", "is", null)
    .lte("due_date", end)
    .order("due_date", { ascending: true })
    .order("priority", { ascending: true });

  // الاوراق فقط: اللي ما لها ابناء فعالين
  const all = (data as TNode[]) ?? [];
  const { data: kidsRows } = await sb.from("nodes").select("parent_id").eq("user_id", userId).neq("status", "dropped");
  const parents = new Set(((kidsRows as { parent_id: string | null }[]) ?? []).map((k) => k.parent_id).filter(Boolean));
  const queue = all.filter((n) => !parents.has(n.id));

  let planned = 0;
  for (let i = 0; i < days && queue.length; i++) {
    const d = addDays(start, i);
    const ds = dayISO(d, `${pad(w.startHour)}:00`);
    const de = dayISO(d, `${pad(w.endHour)}:00`);
    if (new Date(de).getTime() < Date.now()) continue;
    const busy = await listEvents(gate.access, gate.calendarId, ds, de);
    let slots = freeSlots(busy, ds, de, w.minMinutes);

    for (const slot of slots) {
      let cursor = Math.max(new Date(slot.start).getTime(), Date.now() + 10 * 60000);
      const slotEnd = new Date(slot.end).getTime();
      while (queue.length && slotEnd - cursor >= 15 * 60000) {
        const idx = queue.findIndex((n) => {
          const need = Math.max(15, n.estimate_min ?? 45);
          return (slotEnd - cursor) / 60000 >= need && (!n.due_date || n.due_date >= d);
        });
        if (idx < 0) break;
        const n = queue.splice(idx, 1)[0];
        const need = Math.max(15, n.estimate_min ?? 45);
        const s = new Date(cursor).toISOString();
        const e = new Date(cursor + need * 60000).toISOString();
        const evId = await upsertEvent(
          gate.access,
          gate.calendarId,
          { summary: n.title, description: (n.note ?? "") + "\n\nمن منير HQ", start: s, end: e },
          n.calendar_event_id
        );
        await sb
          .from("nodes")
          .update({
            scheduled_start: s,
            scheduled_end: e,
            auto_scheduled: true,
            calendar_event_id: evId,
            calendar_synced_at: new Date().toISOString(),
          })
          .eq("id", n.id);
        planned++;
        cursor += (need + 10) * 60000; // بريك 10 دقايق
      }
    }
  }
  return { ok: true, planned, message: planned ? `جدولت ${planned} مهمة على اسبوعك` : "ما فيه مهام محتاجة جدولة" };
}

export function thisWeekStart() {
  return weekStart(todayISO());
}
