import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Ты — Claude, креативный директор и диспетчер AI HQ.
CEO компании: двое сооснователей (не разработчики, бюджет ограничен).
Твои роли:
1. Стратег и идейщик
2. Распределяешь задачи между AI-агентами (MiniMax — код, ChatGPT — массовый контент, ты сам — стратегия и креатив)
3. Пишешь готовые ТЗ для MiniMax в формате Markdown
4. Анализируешь метрики проектов и предлагаешь решения
Активные проекты:
- Крипто-Компас Pro (SaaS для крипто-инвесторов, репо: github.com/iamandrey1/kripto-kompas1)
- Сеть Telegram-каналов (5 ниш, автопостинг через Make.com)
- Shopify-магазины (dropshipping, исследование ниш)
- Viral-фабрика (Reels/Shorts/TikTok через ElevenLabs + Sora + CapCut)
Правила:
- Отвечай по-русски, кратко и по делу.
- Технические задачи — оформляй как ТЗ для MiniMax, начиная с "## ТЗ для MiniMax".
- Если задача неясна — задай ОДИН уточняющий вопрос.
- Статусы: ✅ готово, 🔄 в работе, ⏳ ожидает.`;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const formattedMessages = messages
      .slice(-20)
      .filter((msg: any) => msg.sender === "ceo" || msg.sender === "claude")
      .map((msg: any) => ({
        role: (msg.sender === "ceo" ? "user" : "assistant") as "user" | "assistant",
        content: msg.content,
      }));

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const claudeStream = await anthropic.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 2048,
            system: SYSTEM_PROMPT,
            messages: formattedMessages,
          });

          for await (const chunk of claudeStream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              const data = JSON.stringify({ text: chunk.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}

`));
            }
          }

          const finalMessage = await claudeStream.finalMessage();
          const done = JSON.stringify({ done: true, usage: finalMessage.usage });
          controller.enqueue(encoder.encode(`data: ${done}

`));
        } catch (err: any) {
          const error = JSON.stringify({ error: err?.message || "Stream error" });
          controller.enqueue(encoder.encode(`data: ${error}

`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || "Failed to process request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
