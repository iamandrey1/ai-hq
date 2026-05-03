# ТЗ: Задеплоить AI HQ — Операционный центр CEO

> Это первое и полное задание. Читай внимательно от начала до конца.

---

## Кто мы и что строим

Мы — Jo и Андрей, два CEO. Строим несколько бизнесов с помощью ИИ:
- **Крипто-Компас Pro** — SaaS-платформа для крипто-инвесторов
- **Сеть Telegram-каналов** — 5 каналов с автопостингом
- **Shopify-магазины** — дропшиппинг
- **Viral-фабрика** — контент для Reels/Shorts/TikTok

**AI HQ** — это наш операционный центр: веб-приложение, через которое мы управляем всеми проектами и общаемся с Claude (нашим AI-директором) напрямую из браузера.

---

## Стек

| Слой | Технология |
|------|-----------|
| Frontend | Next.js 15 + TypeScript |
| Стили | Tailwind CSS |
| База данных + Auth | Supabase |
| Хостинг | Vercel |
| AI чат | Anthropic Claude API (claude-sonnet-4-6) |

---

## Репозиторий

Код уже написан и готов к деплою. Репозиторий: **`github.com/iamandrey1/ai-hq`**

Клонируй его и работай с ним. Ничего писать с нуля не нужно — только настроить окружение, подключить сервисы и задеплоить.

---

## ШАГ 0 — Запроси у CEO все необходимые данные

**Прежде чем что-либо делать** — напиши CEO следующее сообщение и жди ответа:

---

Привет! Я готов начать работу над AI HQ. Для деплоя мне нужны следующие данные. Пожалуйста, предоставь их:

**1. Доступ к GitHub**
- Логин от аккаунта `iamandrey1` (или добавь меня как collaborator к репозиторию `ai-hq`)
- Либо Personal Access Token с правами `repo`

**2. Supabase** (нужно создать новый проект или дать доступ к существующему)
- Если создаёте сами: зайдите на supabase.com → New Project → скопируйте `Project URL` и `anon public key` из Settings → API
- Если хотите чтобы я создал — мне нужен логин от supabase.com

**3. Anthropic API Key** (для чата с Claude внутри приложения)
- Зайдите на console.anthropic.com → API Keys → Create Key
- Скопируйте ключ (начинается с `sk-ant-...`)

**4. Vercel** (для хостинга)
- Если есть аккаунт: логин или добавь меня как member
- Если нет: зарегистрируйтесь на vercel.com (бесплатно, через GitHub)

**5. Email-адреса CEO** (для whitelist в Supabase Auth)
- Email Jo
- Email Андрея

Это всё что нужно для старта. После получения данных задеплою за 20–30 минут.

---

## ШАГ 1 — Supabase: создать БД

После получения доступа к Supabase:

1. Зайди в проект → SQL Editor
2. Выполни весь SQL из файла `supabase/schema.sql` в репозитории
3. Проверь что таблицы созданы: `profiles`, `projects`, `tasks`, `messages`, `chat_sessions`, `api_usage`

**Настройка Auth:**
- Supabase Dashboard → Authentication → Email → включить **Magic Link** (должно быть включено по умолчанию)
- Authentication → URL Configuration → добавить в **Redirect URLs**: `https://ai-hq.vercel.app/office`

**Whitelist email:** В Supabase пока нет встроенного whitelist — достаточно не давать ссылку на логин посторонним. Если позже понадобится ограничение — добавим через Edge Function.

---

## ШАГ 2 — Вставить начальные данные (seed)

В SQL Editor выполни:

```sql
INSERT INTO projects (slug, name, category, description, status, progress, repo_url) VALUES
  ('crypto-compass', 'Крипто-Компас Pro', 'crypto', 'SaaS для крипто-инвесторов. MVP-оболочка готова, идёт замена заглушек на реальные данные CoinGecko.', 'active', 22, 'https://github.com/iamandrey1/kripto-kompas1'),
  ('tg-network', 'Сеть TG-каналов', 'telegram', '5 ниш: крипто, психо-факты, AI-заработок, science-shorts, история. Автопостинг через Make.com.', 'active', 8, null),
  ('shopify-stores', 'Магазины DTC', 'shopify', 'Запуск через Shopify + dropshipping. Этап исследования ниш и поставщиков.', 'active', 3, null),
  ('viral-factory', 'Viral-фабрика', 'viral', 'Reels/Shorts/TikTok с монетизацией. Контент-машина на Sora/ElevenLabs/CapCut.', 'active', 0, null);

INSERT INTO tasks (title, description, status, priority) VALUES
  ('Подключить CoinGecko API', 'Интеграция реальных данных криптовалют в Крипто-Компас Pro', 'in_progress', 'high'),
  ('ТЗ на TG-парсер новостей', 'Создать ТЗ для MiniMax на парсер новостей для TG-каналов', 'todo', 'medium'),
  ('Настроить Make.com автопостинг', 'Схема автопостинга для первых 2 TG-каналов', 'todo', 'high');
```

---

## ШАГ 3 — Vercel: деплой

1. Зайди на vercel.com → Add New Project → Import из GitHub → выбери `iamandrey1/ai-hq`
2. Framework: Next.js (определится автоматически)
3. В разделе **Environment Variables** добавь:

| Имя переменной | Значение |
|---------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL проекта Supabase (https://xxx.supabase.co) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key из Supabase |
| `ANTHROPIC_API_KEY` | ключ от Anthropic (sk-ant-...) |

4. Нажми **Deploy**
5. После деплоя скопируй URL (например `https://ai-hq-xxx.vercel.app`)

**Важно:** вернись в Supabase → Authentication → URL Configuration и добавь реальный URL из Vercel в Redirect URLs (замени `ai-hq.vercel.app` на реальный если отличается).

---

## ШАГ 4 — Проверка

После деплоя проверь:

- [ ] Открыть `https://[твой-url].vercel.app` → должен редиректить на `/login`
- [ ] Ввести email Jo → должно прийти письмо с magic link
- [ ] Кликнуть по ссылке → должен войти и попасть на `/office`
- [ ] В правой колонке написать "привет" → Claude должен ответить (текст появляется потоком, не разом)
- [ ] Левая панель: должны отображаться 4 проекта
- [ ] Верхнее меню: Проекты, Задачи, Команда, Бюджет — все ссылки рабочие

---

## ШАГ 5 — Отчёт CEO

После успешного деплоя напиши CEO:

```
✅ AI HQ задеплоен и готов к работе!

🔗 Ссылка: https://[url].vercel.app
📧 Для входа используй magic link — просто введи свой email на странице логина

Что сделано:
- Supabase БД настроена, таблицы и данные созданы
- Vercel деплой активен, автодеплой с GitHub включён
- Claude API подключён, чат работает со стримингом
- Аутентификация через magic link (пароли не нужны)

Следующий шаг (жду подтверждения от CEO):
Подключить данные из Supabase в реальном времени вместо статичного store — 
чтобы проекты/задачи/сообщения сохранялись между сессиями.
```

---

## Важные детали кода

Всё уже реализовано, но знай:

- **Чат работает через SSE** (Server-Sent Events) — ответ Claude стримится, не ждёт полного ответа
- **Модель Claude**: `claude-sonnet-4-6` (не добавляй даты к названию — сломается)
- **Middleware** (`src/middleware.ts`) — защищает все страницы, неавторизованных редиректит на `/login`
- **Store** (`src/lib/store.ts`) — пока данные в памяти (Zustand). После подтверждения CEO переключим на Supabase

---

## Если что-то не работает

**Ошибка 500 в чате** → проверь `ANTHROPIC_API_KEY` в Vercel env variables

**Magic link не приходит** → проверь Supabase → Authentication → Email Settings → убедись что Confirm email включён

**Страницы не защищены (логин не требуется)** → проверь что `src/middleware.ts` существует в репозитории и задеплоен

**Ошибка "relation does not exist"** → значит schema.sql не был выполнен в Supabase, повтори шаг 1

---

## Контакт

Все вопросы — пишите CEO (Jo или Андрей). Они передадут Claude, Claude ответит с решением.

**Версия ТЗ:** 2.0  
**Автор:** Claude (AI-директор AI HQ)  
**Дата:** 4 мая 2026
