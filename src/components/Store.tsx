"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { buildTree } from "@/lib/tree";
import type {
  Achievement, Area, HabitLog, LedgerEntry, Metric, Profile, TNode, TreeNode,
} from "@/lib/types";
import { todayISO } from "@/lib/dates";

type Toast = { id: number; text: string; undo?: () => void };

type Ctx = {
  ready: boolean;
  userId: string;
  profile: Profile | null;
  areas: Area[];
  nodes: TNode[];
  tree: Map<string, TreeNode[]>;      // area_id -> شجرة
  allTree: TreeNode[];                // كل الجذور
  habitLogs: HabitLog[];
  metrics: Metric[];
  ledger: LedgerEntry[];
  achievements: Achievement[];
  toasts: Toast[];
  say: (text: string, undo?: () => void) => void;
  reload: () => Promise<void>;
  addNode: (p: Partial<TNode>) => Promise<string | null>;
  patchNode: (id: string, p: Partial<TNode>) => Promise<void>;
  setStatus: (id: string, status: TNode["status"]) => Promise<void>;
  removeNode: (id: string) => Promise<void>;
  moveNode: (id: string, parent_id: string | null, area_id: string | null, sort: number) => Promise<void>;
  toggleHabit: (nodeId: string, date?: string) => Promise<void>;
  upsertMetric: (m: Partial<Metric>) => Promise<void>;
  addLedger: (l: Partial<LedgerEntry>) => Promise<void>;
  patchLedger: (id: string, l: Partial<LedgerEntry>) => Promise<void>;
  removeLedger: (id: string) => Promise<void>;
  addAchievement: (a: Partial<Achievement>) => Promise<void>;
  saveProfile: (p: Partial<Profile>) => Promise<void>;
};

const C = createContext<Ctx | null>(null);
export const useStore = () => {
  const v = useContext(C);
  if (!v) throw new Error("useStore خارج المزود");
  return v;
};

export function StoreProvider({
  userId,
  initial,
  children,
}: {
  userId: string;
  initial: {
    profile: Profile | null;
    areas: Area[];
    nodes: TNode[];
    habitLogs: HabitLog[];
    metrics: Metric[];
    ledger: LedgerEntry[];
    achievements: Achievement[];
  };
  children: React.ReactNode;
}) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [profile, setProfile] = useState(initial.profile);
  const [areas, setAreas] = useState(initial.areas);
  const [nodes, setNodes] = useState(initial.nodes);
  const [habitLogs, setHabitLogs] = useState(initial.habitLogs);
  const [metrics, setMetrics] = useState(initial.metrics);
  const [ledger, setLedger] = useState(initial.ledger);
  const [achievements, setAchievements] = useState(initial.achievements);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ready, setReady] = useState(true);
  const tid = useRef(0);

  const say = useCallback((text: string, undo?: () => void) => {
    const id = ++tid.current;
    setToasts((t) => [...t, { id, text, undo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), undo ? 7000 : 3200);
  }, []);

  const reload = useCallback(async () => {
    const [n, h, m, l, a, ar, pr] = await Promise.all([
      sb.from("nodes").select("*"),
      sb.from("habit_logs").select("*"),
      sb.from("metrics").select("*").order("metric_date", { ascending: false }).limit(400),
      sb.from("ledger").select("*").order("entry_date", { ascending: false }).limit(500),
      sb.from("achievements").select("*").order("happened_on", { ascending: false }).limit(300),
      sb.from("areas").select("*").order("sort"),
      sb.from("profiles").select("*").eq("id", userId).maybeSingle(),
    ]);
    if (n.data) setNodes(n.data as TNode[]);
    if (h.data) setHabitLogs(h.data as HabitLog[]);
    if (m.data) setMetrics(m.data as Metric[]);
    if (l.data) setLedger(l.data as LedgerEntry[]);
    if (a.data) setAchievements(a.data as Achievement[]);
    if (ar.data) setAreas(ar.data as Area[]);
    if (pr.data) setProfile(pr.data as Profile);
    setReady(true);
  }, [sb, userId]);

  // مزامنة حية بين الاجهزة
  useEffect(() => {
    const ch = sb
      .channel("lifeos")
      .on("postgres_changes", { event: "*", schema: "public", table: "nodes" }, (p: any) => {
        setNodes((cur) => {
          if (p.eventType === "DELETE") return cur.filter((x) => x.id !== p.old.id);
          const row = p.new as TNode;
          const i = cur.findIndex((x) => x.id === row.id);
          if (i === -1) return [...cur, row];
          const copy = [...cur];
          copy[i] = { ...copy[i], ...row };
          return copy;
        });
      })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [sb]);

  const tree = useMemo(() => {
    const m = new Map<string, TreeNode[]>();
    for (const a of areas) {
      const rows = nodes.filter((n) => n.area_id === a.id);
      m.set(a.id, buildTree(rows, null));
    }
    return m;
  }, [areas, nodes]);

  const allTree = useMemo(() => buildTree(nodes, null), [nodes]);

  // ---------------------------------------------------------------- طفرات
  const addNode = useCallback(
    async (p: Partial<TNode>) => {
      const row = {
        user_id: userId,
        kind: "task",
        status: "todo",
        title: "مهمة جديدة",
        sort: Date.now() % 100000,
        ...p,
      };
      const { data, error } = await sb.from("nodes").insert(row).select().single();
      if (error) { say("تعذر الحفظ: " + error.message); return null; }
      setNodes((c) => (c.some((x) => x.id === data.id) ? c : [...c, data as TNode]));
      return data.id as string;
    },
    [sb, userId, say]
  );

  const patchNode = useCallback(
    async (id: string, p: Partial<TNode>) => {
      setNodes((c) => c.map((n) => (n.id === id ? { ...n, ...p } as TNode : n)));
      const { error } = await sb.from("nodes").update(p).eq("id", id);
      if (error) say("تعذر الحفظ: " + error.message);
    },
    [sb, say]
  );

  const descendants = useCallback(
    (id: string, list: TNode[]): string[] => {
      const kids = list.filter((n) => n.parent_id === id);
      return [id, ...kids.flatMap((k) => descendants(k.id, list))];
    },
    []
  );

  const setStatus = useCallback(
    async (id: string, status: TNode["status"]) => {
      const ids = descendants(id, nodes);
      const prev = nodes.filter((n) => ids.includes(n.id)).map((n) => ({ id: n.id, status: n.status }));
      const stamp = status === "done" ? new Date().toISOString() : null;
      setNodes((c) => c.map((n) => (ids.includes(n.id) ? { ...n, status, done_at: stamp } : n)));
      const { error } = await sb.from("nodes").update({ status }).in("id", ids);
      if (error) { say("تعذر التحديث"); return; }
      if (status === "done") {
        say(
          ids.length > 1 ? `تم انجاز ${ids.length} مهمة` : "تم الانجاز",
          async () => {
            setNodes((c) => c.map((n) => {
              const p = prev.find((x) => x.id === n.id);
              return p ? { ...n, status: p.status as TNode["status"] } : n;
            }));
            for (const p of prev) await sb.from("nodes").update({ status: p.status }).eq("id", p.id);
          }
        );
      }
    },
    [sb, nodes, descendants, say]
  );

  const removeNode = useCallback(
    async (id: string) => {
      const ids = descendants(id, nodes);
      const backup = nodes.filter((n) => ids.includes(n.id));
      setNodes((c) => c.filter((n) => !ids.includes(n.id)));
      const { error } = await sb.from("nodes").delete().eq("id", id);
      if (error) { say("تعذر الحذف"); setNodes((c) => [...c, ...backup]); return; }
      say(`تم حذف ${ids.length > 1 ? ids.length + " عنصر" : "العنصر"}`, async () => {
        const clean = backup.map(({ ...b }) => b);
        await sb.from("nodes").insert(clean);
        setNodes((c) => [...c, ...backup]);
      });
    },
    [sb, nodes, descendants, say]
  );

  const moveNode = useCallback(
    async (id: string, parent_id: string | null, area_id: string | null, sort: number) => {
      const ids = descendants(id, nodes);
      setNodes((c) => c.map((n) =>
        n.id === id ? { ...n, parent_id, area_id, sort }
        : ids.includes(n.id) ? { ...n, area_id } : n));
      await sb.from("nodes").update({ parent_id, area_id, sort }).eq("id", id);
      if (ids.length > 1) await sb.from("nodes").update({ area_id }).in("id", ids.slice(1));
    },
    [sb, nodes, descendants]
  );

  const toggleHabit = useCallback(
    async (nodeId: string, date?: string) => {
      const d = date ?? todayISO();
      const ex = habitLogs.find((h) => h.node_id === nodeId && h.log_date === d);
      if (ex) {
        setHabitLogs((c) => c.filter((h) => h.id !== ex.id));
        await sb.from("habit_logs").delete().eq("id", ex.id);
      } else {
        const { data } = await sb
          .from("habit_logs")
          .insert({ user_id: userId, node_id: nodeId, log_date: d, done: true })
          .select()
          .single();
        if (data) setHabitLogs((c) => [...c, data as HabitLog]);
      }
    },
    [sb, habitLogs, userId]
  );

  const upsertMetric = useCallback(
    async (m: Partial<Metric>) => {
      const row = { user_id: userId, metric_date: m.metric_date ?? todayISO(), ...m };
      const { data } = await sb.from("metrics").upsert(row, { onConflict: "user_id,metric_date" }).select().single();
      if (data) setMetrics((c) => [data as Metric, ...c.filter((x) => x.metric_date !== data.metric_date)]);
      say("تم حفظ القياس");
    },
    [sb, userId, say]
  );

  const addLedger = useCallback(
    async (l: Partial<LedgerEntry>) => {
      const { data } = await sb.from("ledger").insert({ user_id: userId, ...l }).select().single();
      if (data) setLedger((c) => [data as LedgerEntry, ...c]);
    },
    [sb, userId]
  );

  const patchLedger = useCallback(
    async (id: string, l: Partial<LedgerEntry>) => {
      setLedger((c) => c.map((x) => (x.id === id ? { ...x, ...l } as LedgerEntry : x)));
      await sb.from("ledger").update(l).eq("id", id);
    },
    [sb]
  );

  const removeLedger = useCallback(
    async (id: string) => {
      setLedger((c) => c.filter((x) => x.id !== id));
      await sb.from("ledger").delete().eq("id", id);
    },
    [sb]
  );

  const addAchievement = useCallback(
    async (a: Partial<Achievement>) => {
      const { data } = await sb.from("achievements").insert({ user_id: userId, ...a }).select().single();
      if (data) setAchievements((c) => [data as Achievement, ...c]);
      say("انضاف للانجازات");
    },
    [sb, userId, say]
  );

  const saveProfile = useCallback(
    async (p: Partial<Profile>) => {
      setProfile((c) => ({ ...(c ?? { id: userId }), ...p } as Profile));
      await sb.from("profiles").upsert({ id: userId, ...p });
      say("تم الحفظ");
    },
    [sb, userId, say]
  );

  const value: Ctx = {
    ready, userId, profile, areas, nodes, tree, allTree, habitLogs, metrics, ledger, achievements,
    toasts, say, reload, addNode, patchNode, setStatus, removeNode, moveNode, toggleHabit,
    upsertMetric, addLedger, patchLedger, removeLedger, addAchievement, saveProfile,
  };

  return <C.Provider value={value}>{children}</C.Provider>;
}
