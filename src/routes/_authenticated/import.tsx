import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle } from "@/components/AppShell";
import { logAudit } from "@/lib/audit";
import { detectFields, parseCsvNormalized, parseLegacyDate } from "@/lib/mes";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({
    meta: [
      { title: "Import CSV — JAPAN MC MES" },
      { name: "description", content: "Nạp dữ liệu kế hoạch và thực tế từ file plan.csv và actual.csv của hệ thống cũ." },
      { property: "og:title", content: "Import CSV — JAPAN MC MES" },
      { property: "og:description", content: "Nạp dữ liệu sản xuất từ file CSV cũ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImportPage,
});

async function ensureMachine(code: string, cache: Map<string, string>) {
  const key = code.trim();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;
  const { data } = await supabase.from("machines").select("id").eq("code", key).maybeSingle();
  if (data) {
    cache.set(key, data.id);
    return data.id;
  }
  const { data: created, error } = await supabase
    .from("machines")
    .insert({ code: key, name: key })
    .select("id")
    .single();
  if (error) throw error;
  cache.set(key, created.id);
  return created.id;
}

function ImportPage() {
  const qc = useQueryClient();
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function push(line: string) {
    setLog((l) => [...l, line]);
  }

  async function importPlan(file: File) {
    setBusy(true);
    try {
      const rows = parseCsv(await file.text());
      const cache = new Map<string, string>();
      let ok = 0;
      for (const [i, row] of rows.entries()) {
        const part = row["Ma_Hang"];
        if (!part) continue;
        const machineId = await ensureMachine(row["Ten_May"] ?? "", cache);
        const woNumber = row["WO"] || `${part}-${row["Ten_Cong_Doan"] || "OP"}-${i + 1}`;
        const start = parseLegacyDate(row["Ngay_Bat_Dau"]);
        const end = parseLegacyDate(row["Ngay_Ket_Thuc"]);
        const { data: wo, error } = await supabase
          .from("work_orders")
          .upsert(
            {
              wo_number: woNumber,
              part_number: part,
              part_name: row["Ten_Hang"] ?? null,
              drawing_number: row["ma_ban_ve"] ?? null,
              quantity: Number(row["Qty"]) || 0,
              machine_id: machineId,
              operation: row["Ten_Cong_Doan"] ?? null,
              status: row["Status"] || "PLANNED",
              remark: row["Memo"] ?? null,
            },
            { onConflict: "wo_number" },
          )
          .select("id")
          .single();
        if (error) throw error;
        const { error: jobError } = await supabase.from("jobs").insert({
          work_order_id: wo.id,
          machine_id: machineId,
          plan_start: start?.toISOString() ?? null,
          plan_end: end?.toISOString() ?? null,
          status: "PLANNED",
        });
        if (jobError) throw jobError;
        ok++;
      }
      push(`plan.csv: đã nạp ${ok}/${rows.length} dòng.`);
      await logAudit("IMPORT", "plan_csv", null, { rows: ok });
      qc.invalidateQueries();
    } catch (e) {
      push(`Lỗi plan.csv: ${(e as Error).message}`);
    }
    setBusy(false);
  }

  async function importActual(file: File) {
    setBusy(true);
    try {
      const rows = parseCsv(await file.text());
      let ok = 0;
      for (const row of rows) {
        const drawing = row["ma_ban_ve"];
        if (!drawing) continue;
        const { data: wos } = await supabase
          .from("work_orders")
          .select("id")
          .or(`drawing_number.eq.${drawing},part_number.eq.${drawing}`);
        const wo = wos?.[0];
        if (!wo) continue;
        const start = parseLegacyDate(row["thoi_diem_bat_dau"]);
        const end = parseLegacyDate(row["thoi_diem_hoan_thanh"]);
        const { data: jobs } = await supabase
          .from("jobs")
          .select("id")
          .eq("work_order_id", wo.id)
          .limit(1);
        const job = jobs?.[0];
        if (!job) continue;
        const { error } = await supabase
          .from("jobs")
          .update({
            actual_start: start?.toISOString() ?? null,
            actual_end: end?.toISOString() ?? null,
            status: end ? "COMPLETED" : "RUNNING",
          })
          .eq("id", job.id);
        if (error) throw error;
        ok++;
      }
      push(`actual.csv: đã cập nhật ${ok}/${rows.length} dòng.`);
      await logAudit("IMPORT", "actual_csv", null, { rows: ok });
      qc.invalidateQueries();
    } catch (e) {
      push(`Lỗi actual.csv: ${(e as Error).message}`);
    }
    setBusy(false);
  }

  return (
    <>
      <PageTitle title="IMPORT CSV" sub="Nạp dữ liệu từ hệ thống cũ (plan.csv / actual.csv)" />
      <div className="mes-card p-3 text-[11px]">
        <p className="mb-2">
          <b>plan.csv</b> cần các cột: Ma_Hang, Ten_May, Ten_Cong_Doan, Ngay_Bat_Dau, Ngay_Ket_Thuc, Qty,
          Status, Memo (hỗ trợ ngày kiểu 6/23/2026).
        </p>
        <input
          type="file"
          accept=".csv"
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && importPlan(e.target.files[0])}
        />
        <p className="mt-4 mb-2">
          <b>actual.csv</b> cần các cột: ma_ban_ve, may_gia_cong, thoi_diem_bat_dau, thoi_diem_hoan_thanh,
          trang_thai.
        </p>
        <input
          type="file"
          accept=".csv"
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && importActual(e.target.files[0])}
        />
      </div>
      <div className="mes-card min-h-0 flex-1 overflow-auto p-3 font-mono text-[11px]">
        {busy && <div>Đang xử lý…</div>}
        {log.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </>
  );
}
