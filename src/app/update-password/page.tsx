"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!password || password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="font-display text-4xl font-semibold tracking-[-0.02em] mb-2">
            AI<span className="text-accent">·</span>HQ
          </div>
        </div>

        <div className="bg-panel border border-line rounded-2xl p-8">
          {done ? (
            <div className="text-center">
              <CheckCircle2 size={40} className="text-green mx-auto mb-3" />
              <h1 className="text-xl font-semibold text-ink mb-2">Пароль обновлён</h1>
              <p className="text-ink-3 text-sm">Перенаправляем на страницу входа...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6">
                <Lock size={20} className="text-accent" />
                <h1 className="text-xl font-semibold text-ink">Новый пароль</h1>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] text-ink-3 uppercase tracking-[0.1em] mb-2">
                    Новый пароль
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    className="w-full h-12 bg-bg-2 border border-line rounded-xl px-4 text-ink placeholder:text-ink-3 outline-none focus:border-accent transition-colors"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-ink-3 uppercase tracking-[0.1em] mb-2">
                    Повторите пароль
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Повторите пароль"
                    className="w-full h-12 bg-bg-2 border border-line rounded-xl px-4 text-ink placeholder:text-ink-3 outline-none focus:border-accent transition-colors"
                  />
                </div>
                {error && (
                  <div className="p-3 bg-red/10 border border-red/20 rounded-xl flex items-center gap-2 text-red text-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-accent text-bg rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-accent-2 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Установить пароль"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
