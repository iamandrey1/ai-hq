import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Seed projects
    const projects = [
      {
        slug: "crypto-compass",
        name: "Крипто-Компас Pro",
        category: "crypto",
        description: "SaaS для крипто-инвесторов. MVP-оболочка готова, идёт замена заглушек на реальные данные CoinGecko.",
        status: "active",
        progress: 22,
        repo_url: "https://github.com/iamandrey1/kripto-kompas1",
        agents: ["claude", "minimax"] as const,
      },
      {
        slug: "tg-network",
        name: "Сеть TG-каналов",
        category: "telegram",
        description: "5 ниш: крипто, психо-факты, AI-заработок, science-shorts, история. Автопостинг через Make.com.",
        status: "active",
        progress: 8,
        agents: ["claude", "chatgpt"] as const,
      },
      {
        slug: "shopify-stores",
        name: "Магазины DTC",
        category: "shopify",
        description: "Запуск через Shopify + dropshipping. Этап исследования ниш и поставщиков.",
        status: "active",
        progress: 3,
        agents: ["claude"] as const,
      },
      {
        slug: "viral-factory",
        name: "Viral-фабрика",
        category: "viral",
        description: "Reels/Shorts/TikTok с монетизацией и продвижением каналов. Контент-машина на Sora/Runway/ElevenLabs.",
        status: "active",
        progress: 0,
        agents: ["claude"] as const,
      },
    ];

    for (const project of projects) {
      await supabase.from("projects").upsert(project, { 
        onConflict: "slug",
        ignoreDuplicates: true 
      });
    }

    return Response.json({ success: true, seeded: projects.length });
  } catch (error: any) {
    return Response.json({ error: error?.message }, { status: 500 });
  }
}