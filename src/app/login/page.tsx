"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/office` },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="w-[380px] p-8 rounded-2xl border"
        style={{ background: "var(--panel)", borderColor: "var(--line)" }}
      >
        <div className="mb-8">
          <div
            className="font-display font-semibold text-3xl tracking-tight mb-2"
            style={{ fontStyle: "italic" }}
          >
            AI<span style={{ color: "var(--accent)" }}>·</span>HQ
          </div>
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>
            Операционный центр CEO
          </p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="text-4xl mb-4">✉️</div>
            <p className="font-medium mb-2" style={{ color: "var(--ink)" }}>
              Проверьте почту
            </p>
            <p className="text-sm" style={{ color: "var(--ink-3)" }}>
              Отправили ссылку для входа на{" "}
              <span style={{ color: "var(--accent)" }}>{email}</span>
            </p>
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <label
              className="block font-mono text-xs uppercase tracking-widest mb-2"
              style={{ color: "var(--ink-3)" }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 rounded-xl text-sm mb-4 outline-none transition-colors"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "var(--accent)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "var(--line)")
              }
            />
            {error && (
              <p className="text-xs mb-3" style={{ color: "var(--red)" }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-medium text-sm transition-all"
              style={{
                background: "var(--accent)",
                color: "var(--bg)",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Отправляем..." : "Войти через email"}
            </button>
            <p className="text-xs mt-4 text-center" style={{ color: "var(--ink-3)" }}>
              Доступ только для Jo и Андрея
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
