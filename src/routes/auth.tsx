import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Đăng nhập — JAPAN MC MES" },
      { name: "description", content: "Đăng nhập hệ thống MES JAPAN MC để xem timeline sản xuất, KPI và lệnh sản xuất." },
      { property: "og:title", content: "Đăng nhập — JAPAN MC MES" },
      { property: "og:description", content: "Đăng nhập hệ thống MES JAPAN MC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

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

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="mes-card w-full max-w-sm p-6">
        <p className="text-[11px] font-bold tracking-widest text-primary">DYNAMO JAPAN MC</p>
        <h1 className="mb-4 text-lg font-bold">
          {mode === "login" ? "Đăng nhập MES" : "Tạo tài khoản"}
        </h1>
        <form onSubmit={submit} className="flex flex-col gap-2">
          {mode === "signup" && (
            <input
              className="rounded border border-input px-2 py-1.5 text-xs"
              placeholder="Họ tên"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          )}
          <input
            className="rounded border border-input px-2 py-1.5 text-xs"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="rounded border border-input px-2 py-1.5 text-xs"
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <button
            disabled={busy}
            className="rounded bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
          >
            {mode === "login" ? "ĐĂNG NHẬP" : "ĐĂNG KÝ"}
          </button>
        </form>
        <button
          onClick={google}
          className="mt-2 w-full rounded border border-input px-3 py-2 text-xs font-bold"
        >
          Đăng nhập bằng Google
        </button>
        {message && <p className="mt-3 text-[11px] text-destructive">{message}</p>}
        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-3 text-[11px] text-primary underline"
        >
          {mode === "login" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
        </button>
        <p className="mt-3 text-[10px] text-muted-foreground">
          Tài khoản mới mặc định là OPERATOR. Quản trị viên nâng quyền LEADER/ADMIN trong cơ sở dữ liệu.
        </p>
      </div>
    </div>
  );
}
