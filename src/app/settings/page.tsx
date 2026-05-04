"use client";

import { Corridor } from "@/components/Corridor";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/useProfile";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";
import { LogOut, User, CreditCard } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { profile, loading } = useProfile();
  const supabase = createClient();
  const [name, setName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name })
      .eq("id", profile?.id);
    
    if (error) {
      toast.error("Ошибка сохранения");
    } else {
      toast.success("Профиль обновлён");
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="grid h-screen" style={{ gridTemplateColumns: "240px 1fr" }}>
      <Corridor />
      <main className="flex-1 overflow-y-auto px-10 py-8 pb-16 relative bg-bg">
        <div className="mb-8">
          <h1 className="font-display text-[32px] font-medium tracking-[-0.01em] mb-2">
            <em style={{ fontStyle: "italic", color: "var(--accent)" }}>Настройки</em>
          </h1>
          <p className="text-ink-3 text-sm">Профиль и управление аккаунтом</p>
        </div>

        {/* Profile Section */}
        <div className="mb-10">
          <h2 className="font-display text-[22px] font-medium mb-4 flex items-center gap-2">
            <User size={20} className="text-accent" />
            Профиль
          </h2>
          <div className="bg-panel border border-line rounded-xl p-6 max-w-md">
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-panel-2 rounded-lg" />
                <div className="h-10 bg-panel-2 rounded-lg" />
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-xs font-mono text-ink-3 uppercase tracking-wider mb-1.5">
                    Имя
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-bg border border-line rounded-lg px-4 py-2.5 text-ink text-sm focus:border-accent focus:outline-none transition-colors"
                    placeholder="Ваше имя"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-mono text-ink-3 uppercase tracking-wider mb-1.5">
                    Роль
                  </label>
                  <input
                    type="text"
                    value={profile?.role === "ceo" ? "CEO · Основатель" : profile?.role}
                    disabled
                    className="w-full bg-panel-2 border border-line rounded-lg px-4 py-2.5 text-ink-3 text-sm"
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 bg-accent text-bg rounded-lg text-sm font-medium hover:bg-accent-2 transition-colors disabled:opacity-50"
                >
                  {saving ? "Сохранение..." : "Сохранить"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Budget Link */}
        <div className="mb-10">
          <h2 className="font-display text-[22px] font-medium mb-4 flex items-center gap-2">
            <CreditCard size={20} className="text-accent" />
            Подписки
          </h2>
          <Link
            href="/budget"
            className="inline-flex items-center gap-2 px-6 py-3 bg-panel border border-line rounded-xl text-ink hover:border-accent hover:text-accent transition-colors"
          >
            Управление бюджетом →
          </Link>
        </div>

        {/* Logout */}
        <div className="pt-8 border-t border-line">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 bg-red/10 text-red rounded-xl hover:bg-red/20 transition-colors"
          >
            <LogOut size={18} />
            Выйти
          </button>
        </div>
      </main>
    </div>
  );
}
