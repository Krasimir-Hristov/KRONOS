# KRONOS (Κρόνος)

Лична AI система (**Главен AI Бот + Личен Admin RAG Dashboard**), създадена да пести време при съхранение и намиране на документи (DE / BG / EL), управление на лични данни и криптирани пароли, и кандидатстване пред немски институции (`Wohngeld`, `Kinderzuschlag` — онлайн и на PDF).

## Основни Възможности

- **Директен Масов RAG Сейф (`/documents`):** Drag & Drop качване на много PDF-и и снимки наведнъж (до `50 MB` на файл в частния сейф `kronos-vault` на **Supabase Storage**) без нужда от чат, автоматично AI предложение за заглавие, дата и извлечени факти (`Steuer-ID`, `IBAN`), индивидуално/ZIP сваляне за онлайн портали и опционално обединяване на избрани файлове в 1 PDF.
- **Двузоново Умно Търсене:** Класическо мигновено SQL + векторно търсене в `/documents` и двуетапно търсене с **Jev (`/api/alpha/decisions`) Reranking** в Чат-бота (Зона 1: най-точно попадение по смисъл и време; Зона 2: всички сходни документи от най-нови към най-стари).
- **Лична Памет & Криптирани Пароли (`/vault`):** Стойности с директна референция към изходния документ (`source_document_id`), сървърно `AES-256-GCM` криптиране за пароли със **Step-Up 4-цифрен ПИН**, двупосочна редакция (през бота и ръчно) и **100% физическо изтриване от навсякъде (`Hard Purge`)**.
- **Помощник за Немска Бюрокрация:** Помощ по скрийншот (`Ctrl+V`) при попълване на онлайн портали, водене поле по поле по PDF молби и писане на официални отговори на немски език.

## Технологичен Стек

- **Framework & i18n:** Next.js 16 (App Router, React 19, TypeScript strict, Tailwind CSS v4), TanStack Query v5, `next-intl`
- **База данни, Вход & Файлов Сейф:** **Supabase** (`@supabase/supabase-js` + `@supabase/ssr` + Supabase MCP типове, PostgreSQL `pgvector(1536)` HNSW, Full-Text Search, RLS и **Supabase Storage** с директни Signed URLs до `50 MB` и изолиран адаптер за лесна бъдеща миграция при нужда) + **4-цифрен ПИН код**
- **AI Оркестрация:** OpenRouter API + LangChain & LangGraph (`@langchain/core`, `@langchain/langgraph`, `@langchain/openai`) + `typesafe/jev` Decisions API
- **Качество & Сигурност:** `src/proxy.ts` (CVE-2025-29927 Header Scrubbing), `.coderabbit.yaml` и строг Phase Gate (`pnpm verify`)


## Деплой във Vercel (Production)

1. Импортирай репото във Vercel (Framework: Next.js). Cron задачата `/api/cron/keep-alive` е описана във `vercel.json`.
2. Приложи всички миграции от `supabase/migrations/` по ред (по име на файла) към новия Supabase проект, преди да използваш приложението.
3. Задай променливите от `.env.example` в Project Settings → Environment Variables. При **нова инсталация** генерирай ключове с `openssl rand -hex 32` за `KRONOS_PIN_SECRET`, `KRONOS_VAULT_ENCRYPTION_KEY` и `CRON_SECRET` (Vercel изпраща `CRON_SECRET` като `Authorization: Bearer`). При **миграция със съществуваща база** запази и използвай оригиналната стойност на `KRONOS_VAULT_ENCRYPTION_KEY` — с нов ключ вече записаните пароли не могат да бъдат декриптирани.
4. Постави `NEXT_PUBLIC_APP_URL` на реалния Production адрес.
5. В Supabase включи *Authentication → Password Security → Leaked Password Protection* (изисква план Supabase Pro или по-висок; не е наличен във Free плана).
6. За инсталиране като PWA отвори сайта на телефона и избери „Добави към началния екран“.
