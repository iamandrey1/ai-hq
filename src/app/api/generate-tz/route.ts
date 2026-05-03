import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const GENERATE_TZ_PROMPT = `Ты — AI HQ Manager. Сгенерируй детальное ТЗ для MiniMax Agent на основе запроса CEO.

Формат ТЗ:
## ТЗ №[N] для MiniMax Agent
### Проект: [название]
### Задача: [краткое описание]

### Описание
[детальное описание что нужно сделать]

### Требования
- [ ] [требование 1]
- [ ] [требование 2]

### Технические детали
[техническая информация]

### Критерии приёмки
- [ ] [критерий 1]
- [ ] [критерий 2]

### Репозиторий
[ссылка на GitHub если есть]

### ETA
[оценка времени]`;

export async function POST(request: NextRequest) {
  try {
    const { userRequest } = await request.json();

    if (!userRequest) {
      return NextResponse.json(
        { error: "User request is required" },
        { status: 400 }
      );
    }

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: GENERATE_TZ_PROMPT,
      messages: [{ role: "user", content: userRequest }],
    });

    return NextResponse.json({
      tz: response.content[0].type === "text" ? response.content[0].text : "Ошибка генерации ТЗ",
    });
  } catch (error: any) {
    console.error("Claude API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate TZ" },
      { status: 500 }
    );
  }
}
