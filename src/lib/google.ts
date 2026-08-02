import { TZ } from "./dates";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CAL = "https://www.googleapis.com/calendar/v3";

export type GTokens = {
  user_id: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: string | null;
  calendar_id: string | null;
  sync_token: string | null;
};

/** يجدد access token من الـ refresh token */
export async function refreshAccess(refresh: string): Promise<{ token: string; expires: string } | null> {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    refresh_token: refresh,
    grant_type: "refresh_token",
  });
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) return null;
  const j = await r.json();
  if (!j.access_token) return null;
  return {
    token: j.access_token,
    expires: new Date(Date.now() + (j.expires_in ?? 3600) * 1000).toISOString(),
  };
}

/** يعطي access token صالح، ويجدده إذا لزم */
export async function validAccess(
  tok: GTokens,
  save: (t: { access_token: string; expires_at: string }) => Promise<void>
): Promise<string | null> {
  if (tok.access_token && tok.expires_at && new Date(tok.expires_at).getTime() > Date.now() + 60000) {
    return tok.access_token;
  }
  if (!tok.refresh_token) return null;
  const n = await refreshAccess(tok.refresh_token);
  if (!n) return null;
  await save({ access_token: n.token, expires_at: n.expires });
  return n.token;
}

type EventInput = {
  summary: string;
  description?: string;
  start: string; // ISO
  end: string;   // ISO
  colorId?: string;
};

export async function upsertEvent(
  access: string,
  calendarId: string,
  ev: EventInput,
  eventId?: string | null
): Promise<string | null> {
  const payload = {
    summary: ev.summary,
    description: ev.description ?? "",
    start: { dateTime: ev.start, timeZone: TZ },
    end: { dateTime: ev.end, timeZone: TZ },
    ...(ev.colorId ? { colorId: ev.colorId } : {}),
    extendedProperties: { private: { lifeos: "1" } },
  };
  const url = eventId
    ? `${CAL}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`
    : `${CAL}/calendars/${encodeURIComponent(calendarId)}/events`;
  const r = await fetch(url, {
    method: eventId ? "PATCH" : "POST",
    headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.id ?? null;
}

export async function deleteEvent(access: string, calendarId: string, eventId: string) {
  await fetch(`${CAL}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${access}` },
  });
}

export async function listEvents(
  access: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<Array<{ id: string; summary: string; start: string; end: string; lifeos: boolean }>> {
  const q = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const r = await fetch(`${CAL}/calendars/${encodeURIComponent(calendarId)}/events?${q}`, {
    headers: { Authorization: `Bearer ${access}` },
  });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.items ?? [])
    .filter((e: any) => e.start?.dateTime && e.end?.dateTime)
    .map((e: any) => ({
      id: e.id,
      summary: e.summary ?? "",
      start: e.start.dateTime,
      end: e.end.dateTime,
      lifeos: e.extendedProperties?.private?.lifeos === "1",
    }));
}

/** يحسب الفراغات في يوم عمل، ويرجع فترات فاضية */
export function freeSlots(
  busy: Array<{ start: string; end: string }>,
  dayStartISO: string,
  dayEndISO: string,
  minMinutes = 30
): Array<{ start: string; end: string }> {
  const s = new Date(dayStartISO).getTime();
  const e = new Date(dayEndISO).getTime();
  const blocks = busy
    .map((b) => ({ s: new Date(b.start).getTime(), e: new Date(b.end).getTime() }))
    .filter((b) => b.e > s && b.s < e)
    .sort((a, b) => a.s - b.s);

  const out: Array<{ start: string; end: string }> = [];
  let cur = s;
  for (const b of blocks) {
    if (b.s - cur >= minMinutes * 60000) {
      out.push({ start: new Date(cur).toISOString(), end: new Date(b.s).toISOString() });
    }
    cur = Math.max(cur, b.e);
  }
  if (e - cur >= minMinutes * 60000) {
    out.push({ start: new Date(cur).toISOString(), end: new Date(e).toISOString() });
  }
  return out;
}
