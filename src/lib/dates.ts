export const TZ = "Asia/Riyadh";

export function todayISO(): string {
  const d = new Date();
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return s;
}

export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const a = new Date(todayISO() + "T00:00:00Z").getTime();
  const b = new Date(iso.slice(0, 10) + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "ابريل", "مايو", "يونيو",
  "يوليو", "اغسطس", "سبتمبر", "اكتوبر", "نوفمبر", "ديسمبر",
];

export function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${AR_MONTHS[m - 1]} ${y}`;
}

export function fmtShort(iso?: string | null): string {
  if (!iso) return "";
  const [, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${AR_MONTHS[m - 1]}`;
}

export function fmtTime(iso?: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** بداية الأسبوع = السبت */
export function weekStart(iso?: string): string {
  const base = iso ?? todayISO();
  const d = new Date(base + "T00:00:00Z");
  const dow = d.getUTCDay(); // 0 الأحد .. 6 السبت
  const back = (dow + 1) % 7; // السبت = 0
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function dueClass(iso?: string | null, done?: boolean): "over" | "soon" | "ok" | "" {
  if (!iso || done) return "";
  const k = daysUntil(iso);
  if (k === null) return "";
  if (k < 0) return "over";
  if (k <= 7) return "soon";
  return "ok";
}

export function relDue(iso?: string | null): string {
  const k = daysUntil(iso);
  if (k === null) return "";
  if (k === 0) return "اليوم";
  if (k === 1) return "بكرة";
  if (k === -1) return "متأخرة يوم";
  if (k < 0) return `متأخرة ${Math.abs(k)} يوم`;
  if (k <= 14) return `باقي ${k} يوم`;
  return fmtShort(iso);
}
