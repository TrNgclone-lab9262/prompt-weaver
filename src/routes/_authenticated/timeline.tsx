import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle } from "@/components/AppShell";
import { Timeline, TimelineLegend, type TimelineBar } from "@/components/Timeline";
import { startOfDay, machineStatusClass, machineLabel } from "@/lib/mes";

export const Route = createFileRoute("/_authenticated/timeline")({
  head: () => ({
    meta: [
      { title: "Production Timeline — DYNAMO VIETNAM MC - MES" },
      { name: "description", content: "Timeline sản xuất theo máy với thanh kế hoạch và thanh thực tế, vạch giờ hiện tại." },
      { property: "og:title", content: "Production Timeline — DYNAMO VIETNAM MC - MES" },
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
  const [trayOpen, setTrayOpen] = useState(false);
  const [traySearch, setTraySearch] = useState("");

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
                {machineLabel(m)}
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
      <div className="mes-card p-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTrayOpen(!trayOpen)}
            className="rounded bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground"
          >
            {trayOpen ? "▲ Thu gọn" : "▼ Danh sách máy"} ({data.machines.length})
          </button>
          {["RUN", "WAIT", "SETUP", "BREAKDOWN", "MAINTENANCE", "OFFLINE"].map((s) => {
            const count = data.machines.filter((m) => m.status === s).length;
            if (!count) return null;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? "ALL" : s)}
                title="Bấm để lọc timeline theo trạng thái này"
                className={`rounded px-2 py-0.5 text-[10px] font-bold ${machineStatusClass[s] ?? ""} ${statusFilter === s ? "ring-2 ring-ring" : ""}`}
              >
                {s} {count}
              </button>
            );
          })}
          {trayOpen && (
            <input
              value={traySearch}
              onChange={(e) => setTraySearch(e.target.value)}
              placeholder="Tìm mã/tên máy…"
              className="ml-auto rounded border border-input bg-card px-2 py-1 text-[11px]"
            />
          )}
        </div>
        {trayOpen && (
          <div className="mt-2 flex max-h-40 flex-wrap gap-1 overflow-y-auto">
            {data.machines
              .filter((m) => {
                const q = traySearch.trim().toLowerCase();
                return !q || m.code.toLowerCase().includes(q) || (m.name ?? "").toLowerCase().includes(q);
              })
              .map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMachineFilter(machineFilter === m.code ? "ALL" : m.code)}
                  title={`${machineLabel(m)} — bấm để lọc timeline theo máy này`}
                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${machineStatusClass[m.status] ?? ""} ${machineFilter === m.code ? "ring-2 ring-ring" : ""}`}
                >
                  {m.code}
                </button>
              ))}
          </div>
        )}
      </div>
    </>
  );
}
