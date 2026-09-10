import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle } from "@/components/AppShell";
import { machineStatusClass } from "@/lib/mes";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard KPI — JAPAN MC MES" },
      { name: "description", content: "KPI sản xuất realtime: máy chạy, chờ, hỏng, số lượng kế hoạch và thực tế." },
      { property: "og:title", content: "Dashboard KPI — JAPAN MC MES" },
      { property: "og:description", content: "KPI sản xuất realtime của nhà máy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Kpi({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="mes-card flex-1 p-2 text-center">
      <div className="text-[10px] font-bold text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${tone ?? "text-primary"}`}>{value}</div>
    </div>
  );
}

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [machines, jobs, wos] = await Promise.all([
        supabase.from("machines").select("*").order("sort_order"),
        supabase.from("jobs").select("*"),
        supabase.from("work_orders").select("id, quantity, due_date, status"),
      ]);
      if (machines.error) throw machines.error;
      if (jobs.error) throw jobs.error;
      if (wos.error) throw wos.error;
      return { machines: machines.data, jobs: jobs.data, wos: wos.data };
    },
  });

  if (isLoading || !data) return <p className="text-xs">Đang tải dữ liệu…</p>;

  const count = (s: string) => data.machines.filter((m) => m.status === s).length;
  const planned = data.wos.reduce((a, w) => a + (w.quantity ?? 0), 0);
  const good = data.jobs.reduce((a, j) => a + (j.good_qty ?? 0), 0);
  const ng = data.jobs.reduce((a, j) => a + (j.ng_qty ?? 0), 0);
  const actual = good + ng;
  const now = Date.now();
  const delayed = data.jobs.filter(
    (j) => j.status !== "COMPLETED" && j.plan_end && new Date(j.plan_end).getTime() < now,
  ).length;
  const achievement = planned ? Math.round((good / planned) * 100) : 0;
  const quality = actual ? Math.round((good / actual) * 100) : 0;

  return (
    <>
      <PageTitle title="DASHBOARD" sub="KPI sản xuất — tự làm mới mỗi 60 giây" />
      <div className="flex flex-wrap gap-2">
        <Kpi label="RUNNING" value={count("RUN")} />
        <Kpi label="WAITING" value={count("WAIT")} tone="text-muted-foreground" />
        <Kpi label="SETUP" value={count("SETUP")} tone="text-setup" />
        <Kpi label="BREAKDOWN" value={count("BREAKDOWN")} tone="text-destructive" />
        <Kpi label="DELAY JOBS" value={delayed} tone="text-destructive" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Kpi label="PLANNED QTY" value={planned} />
        <Kpi label="ACTUAL QTY" value={actual} />
        <Kpi label="GOOD QTY" value={good} />
        <Kpi label="NG QTY" value={ng} tone="text-destructive" />
        <Kpi label="ACHIEVEMENT %" value={`${achievement}%`} />
        <Kpi label="QUALITY %" value={`${quality}%`} />
      </div>

      <div className="mes-card min-h-0 flex-1 overflow-auto p-2">
        <h2 className="mb-2 text-xs font-bold">MACHINE STATUS / 設備状況</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
          {data.machines.map((m) => (
            <div key={m.id} className="rounded border border-border p-2">
              <div className="text-[11px] font-bold">{m.code}</div>
              <div className="truncate text-[10px] text-muted-foreground">{m.name}</div>
              <span
                className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold ${machineStatusClass[m.status] ?? ""}`}
              >
                {m.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
