export type Role = "admin" | "leader" | "operator";

export const MACHINE_STATUSES = [
  "RUN",
  "WAIT",
  "SETUP",
  "BREAKDOWN",
  "MAINTENANCE",
  "OFFLINE",
] as const;
export type MachineStatus = (typeof MACHINE_STATUSES)[number];

export const machineStatusClass: Record<string, string> = {
  RUN: "bg-run text-primary-foreground",
  WAIT: "bg-wait text-foreground",
  SETUP: "bg-setup text-primary-foreground",
  BREAKDOWN: "bg-breakdown text-destructive-foreground",
  MAINTENANCE: "bg-maintenance text-primary-foreground",
  OFFLINE: "bg-offline text-primary-foreground",
};

export const WO_STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED", "HOLD", "CANCELLED"] as const;
export const JOB_STATUSES = ["PLANNED", "RUNNING", "PAUSED", "COMPLETED"] as const;

/** Deterministic color per part number, like the original HTML board. */
export function stringToColor(str: string | null | undefined): string {
  if (!str) return "hsl(150, 60%, 35%)";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 131 + str.charCodeAt(i)) | 0;
  }
  return `hsl(${Math.abs(hash * 137) % 360}, 70%, 38%)`;
}

/** Parses M/D/YYYY, D-M-YYYY and YYYY-MM-DD (with optional HH:mm) as in the legacy CSV files. */
export function parseLegacyDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === "null") return null;
  const bits = raw.split(/\s+/);
  const datePart = (bits[0] ?? "").replace(/\./g, "/");
  const parts = datePart.includes("/") ? datePart.split("/") : datePart.split("-");
  if (parts.length !== 3) return null;
  const p0 = parts[0] ?? "";
  const p1 = parts[1] ?? "";
  const p2 = parts[2] ?? "";
  let y: string, m: string, d: string;
  if (p0.length === 4) {
    y = p0;
    m = p1;
    d = p2;
  } else {
    y = p2.length === 2 ? `20${p2}` : p2;
    const first = Number(p0);
    const second = Number(p1);
    if (first > 12 && second <= 12) {
      d = p0;
      m = p1;
    } else {
      m = p0;
      d = p1;
    }
  }
  let hh = 0;
  let mm = 0;
  if (bits[1]) {
    const t = bits[1].split(":");
    hh = Number(t[0]) || 0;
    mm = Number(t[1]) || 0;
  }
  const date = new Date(Number(y), Number(m) - 1, Number(d), hh, mm);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Minimal CSV parser handling quoted cells. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows = text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((row) =>
      row
        .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map((cell) => cell.replace(/^"(.*)"$/, "$1").trim()),
    );
  if (rows.length < 2) return [];
  const headers = (rows[0] ?? []).map((h) => (h || "").replace(/^\uFEFF/, "").trim());
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (h) obj[h] = row[i] ?? "";
    });
    return obj;
  });
}

export function fmtTime(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(
    d.getHours(),
  ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

/* ------------------------------------------------------------------ */
/* Chuẩn hoá tên cột CSV (hỗ trợ tiếng Việt có dấu, hoa/thường, khoảng trắng) */
/* ------------------------------------------------------------------ */

export function normalizeHeader(h: string): string {
  return String(h ?? "")
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Tên chuẩn -> danh sách bí danh có thể gặp trong plan.csv / actual.csv / master.csv */
export const FIELD_ALIASES: Record<string, string[]> = {
  part_number: ["Ma_Hang", "MaHang", "Mã hàng", "part_number", "partno", "part", "item_code", "ma_san_pham"],
  part_name: ["Ten_Hang", "Tên hàng", "part_name", "ten_san_pham", "product_name", "description"],
  drawing_number: ["ma_ban_ve", "Ma_Ban_Ve", "Mã bản vẽ", "drawing_number", "drawing", "dwg", "ban_ve"],
  machine: ["Ten_May", "May", "may_gia_cong", "Máy", "machine", "machine_name", "machine_code", "resource"],
  operation: ["Ten_Cong_Doan", "Cong_Doan", "Công đoạn", "operation", "process", "op", "cong_doan"],
  op_seq: ["thu_tu_gc", "Thu_Tu", "op_seq", "sequence", "seq", "so_thu_tu"],
  plan_start: ["Ngay_Bat_Dau", "Ngày bắt đầu", "plan_start", "start_plan", "start_date", "tu_ngay"],
  plan_end: ["Ngay_Ket_Thuc", "Ngày kết thúc", "plan_end", "end_plan", "end_date", "den_ngay"],
  actual_start: ["thoi_diem_bat_dau", "Thoi_Gian_Bat_Dau", "actual_start", "start_actual", "start_time"],
  actual_end: ["thoi_diem_hoan_thanh", "Thoi_Gian_Hoan_Thanh", "actual_end", "end_actual", "finish_time"],
  quantity: ["Qty", "So_Luong", "Số lượng", "quantity", "qty_plan", "sl"],
  good_qty: ["so_luong_dat", "good_qty", "qty_ok", "ok_qty", "good"],
  ng_qty: ["so_luong_ng", "ng_qty", "qty_ng", "ng", "loi"],
  status: ["Status", "Trang_Thai", "trang_thai", "Trạng thái", "status"],
  wo_number: ["WO", "WO_No", "Wo_Number", "wo_number", "work_order", "lenh_san_xuat", "so_lenh"],
  customer: ["Khach_Hang", "khach_hang", "customer", "cust"],
  due_date: ["Ngay_Giao", "ngay_giao_hang", "due_date", "deadline", "delivery_date"],
  remark: ["Memo", "Ghi_Chu", "ghi_chu", "remark", "note", "notes", "comment"],
};

const ALIAS_INDEX: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    map[normalizeHeader(canonical)] = canonical;
    for (const a of aliases) map[normalizeHeader(a)] = canonical;
  }
  return map;
})();

/** Đổi một dòng CSV thô thành object với tên trường chuẩn của MES. */
export function normalizeRow(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const canonical = ALIAS_INDEX[normalizeHeader(key)];
    const v = (value ?? "").trim();
    if (canonical) {
      if (!out[canonical]) out[canonical] = v;
    } else {
      out[normalizeHeader(key)] = v;
    }
  }
  return out;
}

/** Đọc CSV và trả về các dòng đã chuẩn hoá tên trường. */
export function parseCsvNormalized(text: string): Record<string, string>[] {
  return parseCsv(text).map(normalizeRow);
}

/** Danh sách tên trường chuẩn nhận diện được trong file (dùng để báo cho người dùng). */
export function detectFields(rows: Record<string, string>[]): string[] {
  const found = new Set<string>();
  for (const r of rows.slice(0, 20)) {
    for (const k of Object.keys(r)) if (k in FIELD_ALIASES && r[k]) found.add(k);
  }
  return [...found];
}
