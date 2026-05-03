"use client";

import { Corridor } from "@/components/Corridor";
import { useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";

export default function SettingsPage() {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  const apiKeys = [
    { name: "Anthropic API Key", key: "sk-ant-...", envVar: "ANTHROPIC_API_KEY", description: "Для Claude в чате" },
    { name: "OpenAI API Key", key: "sk-...", envVar: "OPENAI_API_KEY", description: "Для ChatGPT контента" },
    { name: "Supabase Key", key: "eyJ...", envVar: "SUPABASE_KEY", description: "База данных и auth" },
  ];

  const integrations = [
    { name: "Telegram Bot", status: "connected", icon: "TG" },
    { name: "GitHub", status: "connected", icon: "GH" },
    { name: "Vercel", status: "connected", icon: "V" },
    { name: "Make.com", status: "disconnected", icon: "MK" },
  ];

  const toggleKey = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="grid h-screen" style={{ gridTemplateColumns: "240px 1fr" }}>
      <Corridor />
      <main className="flex-1 overflow-y-auto px-10 py-8 pb-16 relative bg-bg">
        <div className="mb-8">
          <h1 className="font-display text-[32px] font-medium tracking-[-0.01em] mb-2">
            <em style={{ fontStyle: "italic", color: "var(--accent)" }}>Настройки</em>
          </h1>
          <p className="text-ink-3 text-sm">API-ключи, интеграции и конфигурация</p>
        </div>

        {/* API Keys */}
        <div className="mb-10">
          <h2 className="font-display text-[22px] font-medium mb-4">API Ключи</h2>
          <div className="space-y-4">
            {apiKeys.map((item, i) => (
              <div key={i} className="bg-panel border border-line rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-medium text-[14px] mb-1">{item.name}</div>
                    <div className="font-mono text-[10px] text-ink-3 uppercase">{item.envVar}</div>
                  </div>
                  <button
                    onClick={() => toggleKey(item.name)}
                    className="text-ink-3 hover:text-ink transition-colors"
                  >
                    {showKeys[item.name] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-10 bg-bg-2 rounded-lg px-3 flex items-center font-mono text-[13px] text-ink-3">
                    {showKeys[item.name] ? item.key : "•".repeat(20)}
                  </div>
                  <button className="h-10 px-4 bg-panel-2 border border-line rounded-lg text-[12px] text-ink-2 hover:border-accent transition-colors">
                    Изменить
                  </button>
                </div>
                <div className="mt-2 text-[12px] text-ink-3">{item.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Integrations */}
        <div className="mb-10">
          <h2 className="font-display text-[22px] font-medium mb-4">Интеграции</h2>
          <div className="grid grid-cols-2 gap-4">
            {integrations.map((item, i) => (
              <div
                key={i}
                className="bg-panel border border-line rounded-xl p-4flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-panel-2 flex items-center justify-center font-mono text-[12px] font-bold text-ink-2">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[14px]">{item.name}</div>
                  <div className={`font-mono text-[10px] ${item.status === "connected" ? "text-green" : "text-ink-3"}`}>
                    {item.status === "connected" ? "● Подключено" : "○ Не подключено"}
                  </div>
                </div>
                <button
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                    item.status === "connected"
                      ? "bg-red/10 text-red hover:bg-red/20"
                      : "bg-accent/10 text-accent hover:bg-accent/20"
                  }`}
                >
                  {item.status === "connected" ? "Отключить" : "Подключить"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* System Prompt */}
        <div className="mb-10">
          <h2 className="font-display text-[22px] font-medium mb-4">Системный промпт Claude</h2>
          <div className="bg-panel border border-line rounded-xl p-5">
            <div className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.1em] mb-2">
              Системный промпт для Claude Opus 4.7
            </div>
            <textarea
              className="w-full h-48 bg-bg-2 rounded-lg p-4 text-[13px] text-ink-2 border border-line resize-none outline-none focus:border-accent transition-colors"
              placeholder="Вставьте системный промпт Claude..."
              defaultValue={`Ты — AI HQ Manager для Jo и Андрея. Твоя задача:
- Координировать проекты (Крипто-Компас, TG-каналы, Shopify, Viral)
- Готовить качественные ТЗ для MiniMax Agent
- Распределять задачи между AI-агентами
- Отвечать на вопросы CEO оперативно`}
            />
            <div className="mt-3 text-[12px] text-ink-3">
              Prompt caching активен — экономия до 90% на повторных вызовах
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-accent text-bg px-6 py-3 rounded-xl font-medium hover:bg-accent-2 transition-colors"
          >
            {saved ? (
              <>
                <Check size={18} />
                Сохранено
              </>
            ) : (
              "Сохранить изменения"
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
