import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { StoreProvider } from "@/components/Store";
import Shell from "@/components/Shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const [profile, areas, nodes, habitLogs, metrics, ledger, achievements] = await Promise.all([
    sb.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    sb.from("areas").select("*").order("sort"),
    sb.from("nodes").select("*"),
    sb.from("habit_logs").select("*"),
    sb.from("metrics").select("*").order("metric_date", { ascending: false }).limit(400),
    sb.from("ledger").select("*").order("entry_date", { ascending: false }).limit(500),
    sb.from("achievements").select("*").order("happened_on", { ascending: false }).limit(300),
  ]);

  return (
    <StoreProvider
      userId={user.id}
      initial={{
        profile: (profile.data as any) ?? null,
        areas: (areas.data as any) ?? [],
        nodes: (nodes.data as any) ?? [],
        habitLogs: (habitLogs.data as any) ?? [],
        metrics: (metrics.data as any) ?? [],
        ledger: (ledger.data as any) ?? [],
        achievements: (achievements.data as any) ?? [],
      }}
    >
      <Shell>{children}</Shell>
    </StoreProvider>
  );
}
