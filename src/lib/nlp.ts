import { todayISO, addDays, weekStart } from "./dates";
import type { Energy, NodeKind } from "./types";

export type Parsed = {
  title: string;
  due_date: string | null;
  priority: number;
  energy: Energy | null;
  estimate_min: number | null;
  tags: string[];
  kind: NodeKind;
  areaHint: string | null;
  recurrence: string | null;
};

const DAY_MAP: Record<string, number> = {
  "السبت": 6, "الاحد": 0, "الأحد": 0, "الاثنين": 1, "الإثنين": 1, "الثلاثاء": 2,
  "الاربعاء": 3, "الأربعاء": 3, "الخميس": 4, "الجمعة": 5,
};

const MONTHS: Record<string, number> = {
  "يناير": 1, "فبراير": 2, "مارس": 3, "ابريل": 4, "أبريل": 4, "مايو": 5, "يونيو": 6,
  "يوليو": 7, "اغسطس": 8, "أغسطس": 8, "سبتمبر": 9, "اكتوبر": 10, "أكتوبر": 10,
  "نوفمبر": 11, "ديسمبر": 12,
};

const AREA_WORDS: Record<string, string> = {
  "شغل": "work", "عمل": "work", "عملي": "work", "وظيفة": "work",
  "صحة": "health", "صحي": "health", "رياضة": "health", "نادي": "health", "جيم": "health",
  "تعلم": "learn", "علمي": "learn", "دراسة": "learn", "قراءة": "learn", "كتاب": "learn",
  "اجتماعي": "social", "عائلة": "social", "اصدقاء": "social", "أصدقاء": "social",
  "نفسي": "psych", "راحة": "psych", "تأمل": "psych", "تامل": "psych",
  "مالي": "money", "فلوس": "money", "ميزانية": "money", "دخل": "money",
};

function nextDow(target: number): string {
  const t = todayISO();
  const cur = new Date(t + "T00:00:00Z").getUTCDay();
  let diff = (target - cur + 7) % 7;
  if (diff === 0) diff = 7;
  return addDays(t, diff);
}

/** يفهم جملة عربية طبيعية ويحولها لمهمة كاملة */
export function parseQuickAdd(raw: string): Parsed {
  let s = " " + raw.trim() + " ";
  const out: Parsed = {
    title: raw.trim(),
    due_date: null,
    priority: 2,
    energy: null,
    estimate_min: null,
    tags: [],
    kind: "task",
    areaHint: null,
    recurrence: null,
  };

  // الوسوم  #tag
  const tags = [...s.matchAll(/#([^\s#]+)/g)].map((m) => m[1]);
  if (tags.length) {
    out.tags = tags;
    s = s.replace(/#[^\s#]+/g, " ");
  }

  // الجانب  @work أو كلمة دالة
  const at = s.match(/@([A-Za-z؀-ۿ]+)/);
  if (at) {
    out.areaHint = AREA_WORDS[at[1]] ?? at[1];
    s = s.replace(at[0], " ");
  } else {
    for (const [w, a] of Object.entries(AREA_WORDS)) {
      if (s.includes(" " + w)) { out.areaHint = a; break; }
    }
  }

  // الأولوية  !1 .. !4  أو كلمة عاجل
  const pr = s.match(/!\s*([1-4])/);
  if (pr) { out.priority = Number(pr[1]); s = s.replace(pr[0], " "); }
  else if (/عاجل|مهم جدا|حرج/.test(s)) out.priority = 1;
  else if (/لاحقا|وقت فراغ|ما هو مستعجل/.test(s)) out.priority = 4;

  // الطاقة
  if (/طاقة عالية|تركيز عميق|ديب ورك/.test(s)) out.energy = "high";
  else if (/طاقة منخفضة|خفيفة|روتيني/.test(s)) out.energy = "low";

  // المدة  30د  ساعة  ساعتين  90 دقيقة
  const mm = s.match(/(\d+)\s*(دقيقة|دقايق|د)\b/);
  const hh = s.match(/(\d+)\s*(ساعة|ساعات|س)\b/);
  if (mm) { out.estimate_min = Number(mm[1]); s = s.replace(mm[0], " "); }
  else if (hh) { out.estimate_min = Number(hh[1]) * 60; s = s.replace(hh[0], " "); }
  else if (/ساعتين/.test(s)) { out.estimate_min = 120; s = s.replace("ساعتين", " "); }
  else if (/نص ساعة/.test(s)) { out.estimate_min = 30; s = s.replace("نص ساعة", " "); }

  // التكرار
  if (/كل يوم|يوميا/.test(s)) { out.recurrence = "daily"; out.kind = "habit"; }
  else if (/كل اسبوع|اسبوعيا|أسبوعيا/.test(s)) { out.recurrence = "weekly"; out.kind = "habit"; }
  else if (/كل شهر|شهريا/.test(s)) { out.recurrence = "monthly"; out.kind = "habit"; }

  // التاريخ
  const t = todayISO();
  if (/\bاليوم\b/.test(s)) { out.due_date = t; s = s.replace("اليوم", " "); }
  else if (/\bبكرة\b|\bغدا\b|\bبكره\b/.test(s)) { out.due_date = addDays(t, 1); s = s.replace(/بكرة|بكره|غدا/, " "); }
  else if (/بعد بكرة|بعد بكره/.test(s)) { out.due_date = addDays(t, 2); s = s.replace(/بعد بكرة|بعد بكره/, " "); }
  else if (/نهاية الاسبوع|نهاية الأسبوع/.test(s)) { out.due_date = addDays(weekStart(t), 6); s = s.replace(/نهاية ال[أا]سبوع/, " "); }
  else if (/الاسبوع الجاي|الأسبوع الجاي|الاسبوع القادم/.test(s)) { out.due_date = addDays(weekStart(t), 13); s = s.replace(/ال[أا]سبوع (الجاي|القادم)/, " "); }
  else if (/نهاية الشهر/.test(s)) {
    const [y, m] = t.split("-").map(Number);
    const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    out.due_date = last; s = s.replace("نهاية الشهر", " ");
  } else {
    const dnum = s.match(/بعد\s*(\d+)\s*(يوم|ايام|أيام)/);
    if (dnum) { out.due_date = addDays(t, Number(dnum[1])); s = s.replace(dnum[0], " "); }
    else {
      const dm = s.match(/(\d{1,2})\s*(يناير|فبراير|مارس|ابريل|أبريل|مايو|يونيو|يوليو|اغسطس|أغسطس|سبتمبر|اكتوبر|أكتوبر|نوفمبر|ديسمبر)/);
      if (dm) {
        const y = Number(t.slice(0, 4));
        const mo = MONTHS[dm[2]];
        const cand = `${y}-${String(mo).padStart(2, "0")}-${String(Number(dm[1])).padStart(2, "0")}`;
        out.due_date = cand < t ? `${y + 1}${cand.slice(4)}` : cand;
        s = s.replace(dm[0], " ");
      } else {
        const iso = s.match(/(20\d{2}-\d{2}-\d{2})/);
        if (iso) { out.due_date = iso[1]; s = s.replace(iso[0], " "); }
        else {
          for (const [w, n] of Object.entries(DAY_MAP)) {
            if (new RegExp("(يوم\\s*)?" + w).test(s)) {
              out.due_date = nextDow(n);
              s = s.replace(new RegExp("(يوم\\s*)?" + w), " ");
              break;
            }
          }
        }
      }
    }
  }

  out.title = s
    .replace(/\s+/g, " ")
    .replace(/^\s*(اضف|أضف|سوي|ذكرني|لازم)\s+/, "")
    .trim() || raw.trim();

  return out;
}
