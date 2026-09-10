import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle } from "@/components/AppShell";
import { useRole } from "@/hooks/useAuth";
import { logAudit } from "@/lib/audit";
import { MACHINE_STATUSES, machineStatusClass, fmtTime } from "@/lib/mes";

export const Route = createFileRoute("/_authenticated/machines")({
  head: () => ({
    meta: [
      { title: "Machine Status — JAPAN MC MES" },
      { name: "description", content: "Theo dõi và cập nhật trạng thái máy: chạy, chờ, setup, hỏng máy, bảo trì, ngừng." },
      { property: "og:title", content: "Machine Status — JAPAN MC MES" },
      { property: "og:description", content: "Trạng thái thiết bị và báo hỏng máy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Machines,
});

function Machines() {
  const { userId } = useRole();
  const qc = useQueryClient();
  const [note, setNote] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["machines"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [machines, logs] = await Promise.all([
        supabase.from("machines").select("*").order("sort_order"),
        supabase.from("machine_status_log").select("*").order("created_at", { ascending: false }).limit(30),
      ]);
      if (machines.error) throw machines.error;
      if (logs.error) throw logs.error;
      return { machines: machines.data, logs: logs.data };
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("machines")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      const { error: logError } = await supabase.from("machine_status_log").insert({
        machine_id: id,
        status,
        note: note[id] ?? null,
        created_by: userId ?? null,
      });
      if (logError) throw logError;
      await logAudit("MACHINE_STATUS", "machine", id, { status, note: note[id] });
    },
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["machines"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!data) return <p className="text-xs">Đang tải…</p>;

  return (
    <>
      <PageTitle title="MACHINE STATUS" sub="設備状況 — cập nhật trạng thái và báo hỏng máy" />
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {data.machines.map((m) => (
          <div key={m.id} className="mes-card p-2">
            <div className="flex items-center justify-between">
              <b className="text-[12px]">{m.code}</b>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${machineStatusClass[m.status] ?? ""}`}>
                {m.status}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {m.name} · {m.workshop}
            </div>
            <input
              value={note[m.id] ?? ""}
              onChange={(e) => setNote({ ...note, [m.id]: e.target.value })}
              placeholder="Ghi chú / lý do"
              className="mt-1 w-full rounded border border-input px-1 py-1 text-[11px]"
            />
            <div className="mt-1 flex flex-wrap gap-1">
              {MACHINE_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus.mutate({ id: m.id, status: s })}
                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                    s === m.status ? "bg-primary text-primary-foreground" : "border border-input"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mes-card min-h-0 flex-1 overflow-auto">
        <table className="mes-table">
          <thead>
            <tr>
              <th>THỜI GIAN</th>
              <th>MÁY</th>
              <th>TRẠNG THÁI</th>
              <th>GHI CHÚ</th>
            </tr>
          </thead>
          <tbody>
            {data.logs.map((l) => (
              <tr key={l.id}>
                <td>{fmtTime(l.created_at)}</td>
                <td>{data.machines.find((m) => m.id === l.machine_id)?.code}</td>
                <td>{l.status}</td>
                <td>{l.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
