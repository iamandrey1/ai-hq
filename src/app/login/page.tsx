"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"magic" | "password">("password");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/office");
      }
    });
  }, [router, supabase]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !email.includes("@")) {
      setError("Введите корректный email");
      return;
    }

    setLoading(true);
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/office`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !email.includes("@")) {
      setError("Введите корректный email");
      return;
    }

    if (!password) {
      setError("Введите пароль");
      return;
    }

    setLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else if (data.user) {
      router.push("/office");
    }
  };

  if (sent && mode === "magic") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 20% 10%, rgba(212, 164, 92, 0.08), transparent 40%), radial-gradient(circle at 80% 90%, rgba(107, 140, 175, 0.06), transparent 40%)",
          }}
        />
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="font-display text-4xl font-semibold tracking-[-0.02em] mb-2">
              AI<span style={{ color: "var(--accent)" }}>·</span>HQ
            </div>
            <div className="font-mono text-[10px] text-ink-3 tracking-[0.15em] uppercase">
              Headquarters · 01
            </div>
          </div>

          <div className="bg-panel border border-line rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green/20 flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-green" />
            </div>
            <h1 className="font-display text-2xl font-medium mb-2">Проверьте почту</h1>
            <p className="text-ink-2 text-sm mb-6">
              Мы отправили ссылку для входа на <b className="text-ink">{email}</b>
            </p>
            <p className="text-ink-3 text-xs">
              Нажмите на ссылку в письме чтобы войти.
            </p>
          </div>

          <button
            onClick={() => setSent(false)}
            className="mt-4 w-full text-center text-ink-3 text-sm hover:text-accent transition-colors"
          >
            Использовать другой email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 20% 10%, rgba(212, 164, 92, 0.08), transparent 40%), radial-gradient(circle at 80% 90%, rgba(107, 140, 175, 0.06), transparent 40%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="font-display text-4xl font-semibold tracking-[-0.02em] mb-2">
            AI<span style={{ color: "var(--accent)" }}>·</span>HQ
          </div>
          <div className="font-mono text-[10px] text-ink-3 tracking-[0.15em] uppercase">
            Headquarters · 01
          </div>
        </div>

        <div className="bg-panel border border-line rounded-2xl p-8">
          <h1 className="font-display text-2xl font-medium mb-1 text-center">
            Вход для CEO
          </h1>
          <p className="text-ink-2 text-sm mb-6 text-center">
            {mode === "password" ? "Войдите с email и паролем" : "Получите ссылку на email"}
          </p>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setMode("password")}
              className={`flex-1 py-2 px-4 rounded-lg font-mono text-xs transition-colors ${
                mode === "password"
                  ? "bg-accent text-bg"
                  : "bg-bg-2 text-ink-3 hover:text-ink"
              }`}
            >
              Пароль
            </button>
            <button
              type="button"
              onClick={() => setMode("magic")}
              className={`flex-1 py-2 px-4 rounded-lg font-mono text-xs transition-colors ${
                mode === "magic"
                  ? "bg-accent text-bg"
                  : "bg-bg-2 text-ink-3 hover:text-ink"
              }`}
            >
              Magic Link
            </button>
          </div>

          <form onSubmit={mode === "password" ? handlePasswordLogin : handleMagicLink}>
            <div className="mb-4">
              <label className="block font-mono text-[10px] text-ink-3 uppercase tracking-[0.1em] mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vovapoland13@gmail.com"
                className="w-full h-12 bg-bg-2 border border-line rounded-xl px-4 text-ink placeholder:text-ink-3 outline-none focus:border-accent transition-colors"
              />
            </div>

            {mode === "password" && (
              <div className="mb-4">
                <label className="block font-mono text-[10px] text-ink-3 uppercase tracking-[0.1em] mb-2">
                  Пароль
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="TempPass123!"
                  className="w-full h-12 bg-bg-2 border border-line rounded-xl px-4 text-ink placeholder:text-ink-3 outline-none focus:border-accent transition-colors"
                />
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red/10 border border-red/20 rounded-xl flex items-center gap-2 text-red text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-accent text-bg rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-accent-2 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {mode === "password" ? "Вход..." : "Отправляю..."}
                </>
              ) : (
                <>
                  {mode === "password" ? "Войти" : "Получить ссылку"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-line">
            <p className="text-ink-3 text-xs text-center">
              Только для CEO: Vova и Андрей
              <br />
              Авторизация через Supabase
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <span className="text-ink-3 text-xs">
            AI HQ v1.0 · Powered by Claude + MiniMax
          </span>
        </div>
      </div>
    </div>
  );
}