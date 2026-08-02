export type NodeKind = "goal" | "project" | "task" | "habit";
export type NodeStatus = "todo" | "doing" | "done" | "blocked" | "dropped";
export type Energy = "high" | "medium" | "low";

export type Area = {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  color: string;
  icon: string | null;
  target_pct: number | null;
  sort: number | null;
};

export type TNode = {
  id: string;
  user_id: string;
  area_id: string | null;
  branch_id: string | null;
  parent_id: string | null;
  kind: NodeKind;
  status: NodeStatus;
  title: string;
  note: string | null;
  priority: number | null;
  energy: Energy | null;
  estimate_min: number | null;
  weight: number | null;
  start_date: string | null;
  due_date: string | null;
  done_at: string | null;
  sort: number | null;
  tags: string[] | null;
  recurrence: string | null;
  target_per_week: number | null;
  calendar_event_id: string | null;
  calendar_synced_at: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  auto_scheduled: boolean | null;
  created_at: string;
  updated_at: string;
};

export type TreeNode = TNode & { kids: TreeNode[] };

export type HabitLog = {
  id: string;
  user_id: string;
  node_id: string;
  log_date: string;
  done: boolean;
  note: string | null;
};

export type Metric = {
  id: string;
  user_id: string;
  metric_date: string;
  weight_kg: number | null;
  body_fat: number | null;
  sleep_hours: number | null;
  energy: number | null;
  exercised: boolean | null;
  steps: number | null;
  note: string | null;
};

export type LedgerEntry = {
  id: string;
  user_id: string;
  entry_date: string;
  kind: "income" | "expense";
  label: string;
  amount: number;
  category: string | null;
  expected: boolean;
  settled: boolean;
  node_id: string | null;
};

export type Achievement = {
  id: string;
  user_id: string;
  area_id: string | null;
  node_id: string | null;
  title: string;
  note: string | null;
  happened_on: string;
  source: string | null;
};

export type Review = {
  id: string;
  user_id: string;
  week_start: string;
  constraints: Record<string, string>;
  wins: string | null;
  blockers: string | null;
  notes: string | null;
  snapshot: Record<string, unknown>;
  completed_at: string | null;
};

export type Profile = {
  id: string;
  full_name: string | null;
  logo_url: string | null;
  timezone: string | null;
  week_start: number | null;
  horizon_from: string | null;
  horizon_to: string | null;
  settings: Record<string, unknown>;
};

export type Automation = {
  id: string;
  user_id: string;
  key: string;
  enabled: boolean;
  config: Record<string, unknown>;
  last_run: string | null;
};
