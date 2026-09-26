import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle } from "@/components/AppShell";
import { machineStatusClass } from "@/lib/mes";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard KPI — DYNAMO VIETNAM MC - MES" },
      { name: "description", content: "KPI sản xuất realtime: máy chạy, chờ, hỏng, số lượng kế hoạch và thực tế." },
      { property: "og:title", content: "Dashboard KPI — DYNAMO VIETNAM MC - MES" },
      { property: "og:description", content: "KPI sản xuất realtime của nhà máy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Kpi({
  label,
  value,
  tone,
  to,
  search,
}: {
  label: string;
  value: string | number;
  tone?: string;
  to?: "/timeline" | "/shinko";
  search?: Record<string, string>;
}) {
  const body = (
    <>
      <div className="text-[10px] font-bold text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${tone ?? "text-primary"}`}>{value}</div>
    </>
  );
  if (to) {
    return (
      <Link
        to={to}
        search={search ?? {}}
        className="mes-card flex-1 cursor-pointer p-2 text-center transition-colors hover:border-primary"
        title="Bấm để mở trang xử lý"
      >
        {body}
      </Link>
    );
  }
  return <div className="mes-card flex-1 p-2 text-center">{body}</div>;
}


function Dashboard() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
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
        <Kpi label="RUNNING" value={count("RUN")} to="/machines" />
        <Kpi label="WAITING" value={count("WAIT")} tone="text-muted-foreground" to="/machines" />
        <Kpi label="SETUP" value={count("SETUP")} tone="text-setup" to="/machines" />
        <Kpi label="BREAKDOWN" value={count("BREAKDOWN")} tone="text-destructive" to="/machines" />
        <Kpi label="DELAY JOBS" value={delayed} tone="text-destructive" to="/shinko" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Kpi label="PLANNED QTY" value={planned} />
        <Kpi label="ACTUAL QTY" value={actual} />
        <Kpi label="GOOD QTY" value={good} />
        <Kpi label="NG QTY" value={ng} tone="text-destructive" />
        <Kpi label="ACHIEVEMENT %" value={`${achievement}%`} />
        <Kpi label="QUALITY %" value={`${quality}%`} />
      </div>

      <div className="mes-card flex min-h-0 flex-1 flex-col overflow-hidden p-2">
        <h2 className="mb-2 text-xs font-bold">MACHINE STATUS / 設備状況</h2>
        <div className="mb-2 flex flex-wrap gap-1">
          {(["ALL", "RUN", "WAIT", "SETUP", "BREAKDOWN", "MAINTENANCE", "OFFLINE"] as const).map((s) => {
            const n = s === "ALL" ? data.machines.length : count(s);
            const on = statusFilter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded border px-2 py-0.5 text-[10px] font-bold transition-colors ${
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"
                }`}
              >
                {s} ({n})
              </button>
            );
          })}
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
            {data.machines
              .filter((m) => statusFilter === "ALL" || m.status === statusFilter)
              .map((m) => (
                <Link
                  key={m.id}
                  to="/machines"
                  className="cursor-pointer rounded border border-border p-2 transition-colors hover:border-primary"
                  title="Bấm để mở trang Trạng thái máy"
                >
                  <div className="text-[11px] font-bold">{m.code}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{m.name}</div>
                  <span
                    className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold ${machineStatusClass[m.status] ?? ""}`}
                  >
                    {m.status}
                  </span>
                </Link>
              ))}
          </div>
        </div>
      </div>
    </>
  );
}
