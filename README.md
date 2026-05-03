# AI HQ — Операционный центр CEO

> Единая панель управления для Jo и Андрея. AI-команда, проекты, задачи.

## Стек

| Слой | Технология |
|------|-----------|
| Frontend | Next.js 15 + TypeScript |
| Стили | Tailwind CSS |
| База данных | Supabase |
| AI | Anthropic Claude API |
| Хостинг | Vercel |

## Страницы

- `/office` — главная страница (проекты, команда, чат с Claude)
- `/projects` — все проекты
- `/tasks` — канбан задач
- `/team` — AI-команда
- `/budget` — расходы
- `/settings` — настройки (API-ключи)

## Установка

```bash
# Клонировать репозиторий
git clone https://github.com/iamandrey1/ai-hq.git
cd ai-hq

# Установить зависимости
npm install

# Создать .env.local
cp .env.example .env.local
# Заполнить переменные окружения

# Запустить dev сервер
npm run dev
```

## Переменные окружения

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
```

## Деплой на Vercel

```bash
# Через GitHub (рекомендуется)
# Подключить репозиторий к Vercel
# Добавить env variables в Vercel Dashboard

# Или через CLI
npm i -g vercel
vercel deploy
```

## Supabase Setup

1. Создать проект на [supabase.com](https://supabase.com)
2. Запустить SQL из `supabase/schema.sql`
3. Скопировать URL и Anon Key в .env.local

## Структура проекта

```
ai-hq/
├── src/
│   ├── app/           # Next.js App Router pages
│   ├── components/    # UI components
│   ├── lib/           # Utilities, store, Supabase
│   └── types/         # TypeScript types
├── supabase/          # SQL schema
└── public/            # Static assets
```

## Дизайн-система

- **Фон**: `#0e0d0b`
- **Акцент**: `#d4a45c` (золотой)
- **Шрифты**: Fraunces (display), Manrope (body), JetBrains Mono (code)
