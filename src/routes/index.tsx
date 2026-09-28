import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/dynamo-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DYNAMO VIETNAM MC - MES — Plan vs Actual Production Control" },
      {
        name: "description",
        content:
          "Hệ thống MES cho nhà máy cơ khí chính xác: timeline sản xuất, Plan vs Actual, KPI, 進行リスト và quản lý lệnh sản xuất theo 3 vai trò.",
      },
      { property: "og:title", content: "DYNAMO VIETNAM MC - MES — Plan vs Actual Production Control" },
      {
        property: "og:description",
        content: "Timeline sản xuất, Plan vs Actual, KPI và quản lý lệnh sản xuất theo vai trò.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: "📅", title: "Timeline máy", desc: "Plan vs Actual theo thời gian thực, lọc theo xưởng & trạng thái" },
  { icon: "📋", title: "進行リスト", desc: "Theo dõi tiến độ từng mã hàng, Job Timeline tức thì" },
  { icon: "🗂", title: "Work Orders", desc: "Quản lý lệnh sản xuất, hạn giao & mức ưu tiên" },
  { icon: "📊", title: "KPI sản xuất", desc: "Sản lượng, chất lượng, tỷ lệ đạt — cập nhật mỗi 60 giây" },
];

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        background:
          "linear-gradient(160deg, oklch(0.18 0.02 250) 0%, oklch(0.24 0.03 250) 60%, oklch(0.3 0.08 27) 140%)",
      }}
    >
      <header className="flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-3">
          <img src={logo.url} alt="DYNAMO" className="h-10 w-10 rounded-md bg-white/95 object-contain p-1" />
          <span className="text-sm font-bold tracking-widest text-white">DYNAMO VIETNAM MC</span>
        </div>
        <Link
          to="/auth"
          className="rounded-lg border border-white/25 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/10"
        >
          Đăng nhập
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="rounded-full border border-white/20 bg-white/5 px-4 py-1 text-[11px] font-bold tracking-widest text-white/80">
          MANUFACTURING EXECUTION SYSTEM
        </span>
        <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight text-white lg:text-5xl">
          Kiểm soát sản xuất
          <br />
          <span style={{ color: "oklch(0.65 0.2 27)" }}>Plan vs Actual</span> theo thời gian thực
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/70">
          Hệ thống MES cho nhà máy cơ khí chính xác: timeline máy 24/7, 進行リスト, KPI chất lượng và
          quản lý lệnh sản xuất — phân quyền ADMIN / LEADER / OPERATOR.
        </p>
        <Link
          to="/auth"
          className="mt-8 rounded-lg bg-dynamo px-8 py-3 text-sm font-bold text-white shadow-lg transition-opacity hover:opacity-90"
        >
          VÀO HỆ THỐNG MES →
        </Link>

        <div className="mt-14 grid w-full max-w-4xl grid-cols-1 gap-3 pb-12 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur-sm"
            >
              <span className="text-xl">{f.icon}</span>
              <p className="mt-2 text-sm font-bold text-white">{f.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/60">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
