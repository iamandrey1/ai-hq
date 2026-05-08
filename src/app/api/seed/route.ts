import { createClient } from "@supabase/supabase-js";

// Seed endpoint - seeds projects into Supabase
// Uses anon key so RLS policies must allow insert

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Seed projects
    type SeedProject = {
      slug: string;
      name: string;
      category: string;
      description: string;
      status: string;
      progress: number;
      repo_url: string | null;
    };

    const projects: SeedProject[] = [
      {
        slug: "crypto-compass",
        name: "Крипто-Компас Pro",
        category: "crypto",
        description: "SaaS для крипто-инвесторов. MVP-оболочка готова, идёт замена заглушек на реальные данные CoinGecko.",
        status: "active",
        progress: 22,
        repo_url: "https://github.com/iamandrey1/kripto-kompas1",
      },
      {
        slug: "tg-network",
        name: "Сеть TG-каналов",
        category: "telegram",
        description: "5 ниш: крипто, психо-факты, AI-заработок, science-shorts, история. Автопостинг через Make.com.",
        status: "active",
        progress: 8,
        repo_url: null,
      },
      {
        slug: "shopify-stores",
        name: "Магазины DTC",
        category: "shopify",
        description: "Запуск через Shopify + dropshipping. Этап исследования ниш и поставщиков.",
        status: "active",
        progress: 3,
        repo_url: null,
      },
      {
        slug: "viral-factory",
        name: "Viral-фабрика",
        category: "viral",
        description: "Reels/Shorts/TikTok с монетизацией и продвижением каналов. Контент-машина на Sora/Runway/ElevenLabs.",
        status: "active",
        progress: 0,
        repo_url: null,
      },
    ];

    let seeded = 0;
    const errors: string[] = [];

    for (const project of projects) {
      // Try insert first, if exists skip
      const { error } = await supabase
        .from("projects")
        .insert(project);
      
      if (error) {
        if (error.code === "23505") {
          // Duplicate key - skip
          seeded++;
        } else {
          errors.push(`${project.name}: ${error.message}`);
        }
      } else {
        seeded++;
      }
    }

    return Response.json({ success: true, seeded, errors: errors.length > 0 ? errors : undefined });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}