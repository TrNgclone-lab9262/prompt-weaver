import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/dynamo-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Đăng nhập — DYNAMO VIETNAM MC - MES" },
      { name: "description", content: "Đăng nhập hệ thống DYNAMO VIETNAM MC - MES để xem timeline sản xuất, KPI và lệnh sản xuất." },
      { property: "og:title", content: "Đăng nhập — DYNAMO VIETNAM MC - MES" },
      { property: "og:description", content: "Đăng nhập hệ thống DYNAMO VIETNAM MC - MES." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const HIGHLIGHTS = [
  { icon: "📅", text: "Timeline máy 24/7 — Plan vs Actual theo thời gian thực" },
  { icon: "📋", text: "進行リスト (Shinko Risuto) — tiến độ từng mã hàng tức thì" },
  { icon: "📊", text: "KPI sản xuất, chất lượng & trạng thái máy toàn xưởng" },
];

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else navigate({ to: "/dashboard", replace: true });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName },
        },
      });
      if (error) setMessage(error.message);
      else if (data.session) navigate({ to: "/dashboard", replace: true });
      else setMessage("Đã tạo tài khoản. Vui lòng kiểm tra email để xác nhận rồi đăng nhập.");
    }
    setBusy(false);
  }

  async function google() {
    const { lovable } = await import("@/integrations/lovable/index");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setMessage("Không đăng nhập được bằng Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  const inputCls =
    "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-dynamo focus:ring-2 focus:ring-dynamo/20";

  return (
    <div className="flex min-h-screen">
      {/* Cột trái — Hero thương hiệu */}
      <div
        className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-10 lg:flex"
        style={{
          background:
            "linear-gradient(150deg, oklch(0.18 0.02 250) 0%, oklch(0.25 0.03 250) 55%, oklch(0.32 0.1 27) 130%)",
        }}
      >
        <div
          className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full opacity-25 blur-3xl"
          style={{ background: "oklch(0.55 0.22 27)" }}
        />
        <div className="relative flex items-center gap-3">
          <img src={logo.url} alt="DYNAMO" className="h-10 w-10 rounded-md bg-white/95 object-contain p-1" />
          <span className="text-sm font-bold tracking-widest text-white">DYNAMO VIETNAM MC</span>
        </div>
        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight text-white">
            Hành trình sản xuất
            <br />
            bắt đầu tại đây.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
            Hệ thống điều hành sản xuất & kiểm soát tiến độ gia công CNC — Plan vs Actual, phân quyền
            ADMIN / LEADER / OPERATOR.
          </p>
          <ul className="mt-8 flex flex-col gap-3">
            {HIGHLIGHTS.map((h) => (
              <li key={h.text} className="flex items-center gap-3 text-sm text-white/85">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-base">
                  {h.icon}
                </span>
                {h.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[11px] text-white/40">© 2026 DYNAMO VIETNAM MC — Manufacturing Execution System</p>
      </div>

      {/* Cột phải — Form xác thực */}
      <div className="flex flex-1 items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <img src={logo.url} alt="DYNAMO" className="h-16 w-16 rounded-xl border border-border bg-card object-contain p-1.5 shadow-sm" />
            <h2 className="mt-4 text-xl font-bold">
              {mode === "login" ? "Xin chào! Chào mừng quay trở lại" : "Tạo tài khoản mới"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "login" ? "Đăng nhập để vào hệ thống MES" : "Đăng ký tài khoản DYNAMO VIETNAM MC - MES"}
            </p>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            {mode === "signup" && (
              <input className={inputCls} placeholder="Họ tên" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            )}
            <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className={inputCls} type="password" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            <button
              disabled={busy}
              className="rounded-lg bg-dynamo px-3 py-2.5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {mode === "login" ? "ĐĂNG NHẬP" : "ĐĂNG KÝ"}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-muted-foreground">hoặc</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={google}
            className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm font-bold transition-colors hover:bg-muted"
          >
            Đăng nhập bằng Google
          </button>

          {message && <p className="mt-3 text-center text-[11px] text-destructive">{message}</p>}

          <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="mt-4 w-full text-center text-xs text-dynamo underline">
            {mode === "login" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
          </button>
          <p className="mt-4 text-center text-[10px] text-muted-foreground">
            Tài khoản mới mặc định là OPERATOR. Quản trị viên nâng quyền LEADER/ADMIN trong cơ sở dữ liệu.
          </p>
        </div>
      </div>
    </div>
  );
}
