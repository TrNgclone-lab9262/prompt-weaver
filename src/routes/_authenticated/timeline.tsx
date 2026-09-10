import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle } from "@/components/AppShell";
import { Timeline, TimelineLegend, type TimelineBar } from "@/components/Timeline";
import { startOfDay, machineStatusClass } from "@/lib/mes";

export const Route = createFileRoute("/_authenticated/timeline")({
  head: () => ({
    meta: [
      { title: "Production Timeline — JAPAN MC MES" },
      { name: "description", content: "Timeline sản xuất theo máy với thanh kế hoạch và thanh thực tế, vạch giờ hiện tại." },
      { property: "og:title", content: "Production Timeline — JAPAN MC MES" },
      { property: "og:description", content: "Timeline máy, Plan vs Actual theo ngày/tuần/tháng." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TimelinePage,
});

type Zoom = 1 | 7 | 30;

function TimelinePage() {
  const [zoom, setZoom] = useState<Zoom>(7);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [machineFilter, setMachineFilter] = useState("ALL");
  const [selected, setSelected] = useState<TimelineBar | null>(null);

  const base = startOfDay(new Date());
  if (zoom === 7) base.setDate(base.getDate() - base.getDay() + 1);
  if (zoom === 30) base.setDate(1);
  base.setDate(base.getDate() + offset * zoom);

  const { data, isLoading } = useQuery({
    queryKey: ["timeline"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [machines, jobs] = await Promise.all([
        supabase.from("machines").select("*").order("sort_order"),
        supabase
          .from("jobs")
          .select("*, work_orders(wo_number, part_number, part_name, quantity)")
          .order("plan_start"),
      ]);
      if (machines.error) throw machines.error;
      if (jobs.error) throw jobs.error;
      return { machines: machines.data, jobs: jobs.data };
    },
  });

  if (isLoading || !data) return <p className="text-xs">Đang tải timeline…</p>;

  const rows = data.machines
    .filter((m) => machineFilter === "ALL" || m.code === machineFilter)
    .filter((m) => statusFilter === "ALL" || m.status === statusFilter)
    .map((m) => ({ id: m.id, label: m.code, sublabel: `${m.name} · ${m.status}` }));

  const now = Date.now();
  const bars: TimelineBar[] = data.jobs
    .filter((j) => j.machine_id)
    .map((j) => {
      const wo = j.work_orders as unknown as {
        wo_number: string;
        part_number: string;
        part_name: string | null;
        quantity: number;
      } | null;
      return {
        rowId: j.machine_id!,
        key: j.id,
        title: `${wo?.part_number ?? "?"} · ${wo?.wo_number ?? ""}`,
        planStart: j.plan_start,
        planEnd: j.plan_end,
        actualStart: j.actual_start,
        actualEnd: j.actual_end,
        colorKey: wo?.part_number ?? j.id,
        delayed:
          j.status !== "COMPLETED" && !!j.plan_end && new Date(j.plan_end).getTime() < now,
      };
    });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PageTitle title="PRODUCTION TIMELINE" sub="Plan vs Actual theo máy" />
        <div className="flex flex-wrap items-center gap-1 text-[11px]">
          {([1, 7, 30] as Zoom[]).map((z) => (
            <button
              key={z}
              onClick={() => {
                setZoom(z);
                setOffset(0);
              }}
              className={`rounded px-2 py-1 font-bold ${zoom === z ? "bg-primary text-primary-foreground" : "bg-card"}`}
            >
              {z === 1 ? "NGÀY" : z === 7 ? "TUẦN" : "THÁNG"}
            </button>
          ))}
          <button onClick={() => setOffset(offset - 1)} className="rounded bg-card px-2 py-1 font-bold">
            ◀
          </button>
          <button onClick={() => setOffset(0)} className="rounded bg-card px-2 py-1 font-bold">
            HÔM NAY
          </button>
          <button onClick={() => setOffset(offset + 1)} className="rounded bg-card px-2 py-1 font-bold">
            ▶
          </button>
          <select
            value={machineFilter}
            onChange={(e) => setMachineFilter(e.target.value)}
            className="rounded border border-input bg-card px-1 py-1"
          >
            <option value="ALL">Tất cả máy</option>
            {data.machines.map((m) => (
              <option key={m.id} value={m.code}>
                {m.code}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-input bg-card px-1 py-1"
          >
            <option value="ALL">Mọi trạng thái</option>
            {["RUN", "WAIT", "SETUP", "BREAKDOWN", "MAINTENANCE", "OFFLINE"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <TimelineLegend />
      <Timeline rows={rows} bars={bars} rangeStart={base} days={zoom} onBarClick={setSelected} />
      {selected && (
        <div className="mes-card p-2 text-[11px]">
          <b>{selected.title}</b> — Plan: {selected.planStart ?? "-"} → {selected.planEnd ?? "-"} ·
          Actual: {selected.actualStart ?? "-"} → {selected.actualEnd ?? "đang chạy"}
          <button onClick={() => setSelected(null)} className="ml-2 underline">
            đóng
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        {data.machines.map((m) => (
          <span
            key={m.id}
            className={`rounded px-2 py-0.5 text-[10px] font-bold ${machineStatusClass[m.status] ?? ""}`}
          >
            {m.code} {m.status}
          </span>
        ))}
      </div>
    </>
  );
}
