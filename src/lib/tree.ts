import type { TNode, TreeNode } from "./types";

/** يبني الشجرة من قائمة مسطحة، مرتبة حسب sort ثم تاريخ الإنشاء */
export function buildTree(rows: TNode[], rootParent: string | null = null): TreeNode[] {
  const byParent = new Map<string | null, TNode[]>();
  for (const r of rows) {
    const k = r.parent_id;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(r);
  }
  const sortFn = (a: TNode, b: TNode) =>
    (a.sort ?? 0) - (b.sort ?? 0) || a.created_at.localeCompare(b.created_at);

  const attach = (parent: string | null): TreeNode[] =>
    (byParent.get(parent) ?? []).sort(sortFn).map((n) => ({ ...n, kids: attach(n.id) }));

  return attach(rootParent);
}

export function isLeaf(n: TreeNode) {
  return !n.kids || n.kids.filter((k) => k.status !== "dropped").length === 0;
}

/** كل الأوراق (المهام في أدنى مستوى) - هي وحدة القياس */
export function leaves(n: TreeNode): TreeNode[] {
  if (n.status === "dropped") return [];
  if (isLeaf(n)) return [n];
  return n.kids.flatMap(leaves);
}

export function stats(n: TreeNode) {
  const L = leaves(n);
  const totalW = L.reduce((s, x) => s + (Number(x.weight) || 1), 0);
  const doneW = L.filter((x) => x.status === "done").reduce((s, x) => s + (Number(x.weight) || 1), 0);
  return {
    done: L.filter((x) => x.status === "done").length,
    total: L.length,
    pct: totalW ? Math.round((doneW / totalW) * 100) : 0,
  };
}

export function statsOf(list: TreeNode[]) {
  const L = list.flatMap(leaves);
  const totalW = L.reduce((s, x) => s + (Number(x.weight) || 1), 0);
  const doneW = L.filter((x) => x.status === "done").reduce((s, x) => s + (Number(x.weight) || 1), 0);
  return {
    done: L.filter((x) => x.status === "done").length,
    total: L.length,
    pct: totalW ? Math.round((doneW / totalW) * 100) : 0,
  };
}

export function flatten(list: TreeNode[]): TreeNode[] {
  return list.flatMap((n) => [n, ...flatten(n.kids)]);
}

export function findNode(list: TreeNode[], id: string): TreeNode | null {
  for (const n of list) {
    if (n.id === id) return n;
    const f = findNode(n.kids, id);
    if (f) return f;
  }
  return null;
}

/** مسار المهمة من الجذر (للـ breadcrumb) */
export function pathTo(list: TreeNode[], id: string, acc: TreeNode[] = []): TreeNode[] | null {
  for (const n of list) {
    const next = [...acc, n];
    if (n.id === id) return next;
    const f = pathTo(n.kids, id, next);
    if (f) return f;
  }
  return null;
}

/** عند تغيير حالة عقدة: كل أبنائها تتبعها، والآباء تتحدث تلقائيا بالحساب */
export function cascadeIds(n: TreeNode): string[] {
  return [n.id, ...n.kids.flatMap(cascadeIds)];
}
