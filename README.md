# KRONOS (Κρόνος)

Лична AI система (**Главен AI Бот + Личен Admin RAG Dashboard**), създадена да пести време при съхранение и намиране на документи (DE / BG / EL), управление на лични данни и криптирани пароли, и кандидатстване пред немски институции (`Wohngeld`, `Kinderzuschlag` — онлайн и на PDF).

## Основни Възможности

- **Директен Масов RAG Сейф (`/documents`):** Drag & Drop качване на много PDF-и и снимки наведнъж (до `50 MB` на файл в Cloudflare R2) без нужда от чат, автоматично AI предложение за заглавие, дата и извлечени факти (`Steuer-ID`, `IBAN`), индивидуално/ZIP сваляне за онлайн портали и опционално обединяване на избрани файлове в 1 PDF.
- **Двузоново Умно Търсене:** Класическо мигновено SQL + векторно търсене в `/documents` и двуетапно търсене с **Jev (`/api/alpha/decisions`) Reranking** в Чат-бота (Зона 1: най-точно попадение по смисъл и време; Зона 2: всички сходни документи от най-нови към най-стари).
- **Лична Памет & Криптирани Пароли (`/vault`):** Стойности с директна референция към изходния документ (`source_document_id`), сървърно `AES-256-GCM` криптиране за пароли със **Step-Up 4-цифрен ПИН**, двупосочна редакция (през бота и ръчно) и **100% физическо изтриване от навсякъде (`Hard Purge`)**.
- **Помощник за Немска Бюрокрация:** Помощ по скрийншот (`Ctrl+V`) при попълване на онлайн портали, водене поле по поле по PDF молби и писане на официални отговори на немски език.

## Технологичен Стек

- **Framework & i18n:** Next.js 16 (App Router, React 19, TypeScript strict, Tailwind CSS v4), TanStack Query v5, `next-intl`
- **База данни & Вход:** Supabase (`@supabase/supabase-js` + `@supabase/ssr` + Supabase MCP типове, `pgvector(1536)` HNSW, Full-Text Search, RLS) + **4-цифрен ПИН код**
- **Файлов Сейф:** Cloudflare R2 чрез `aws4fetch` (S3 Presigned URLs до `50 MB`)
- **AI Оркестрация:** OpenRouter API + LangChain & LangGraph (`@langchain/core`, `@langchain/langgraph`, `@langchain/openai`) + `typesafe/jev` Decisions API
- **Качество & Сигурност:** `src/proxy.ts` (CVE-2025-29927 Header Scrubbing), `.coderabbit.yaml` и строг Phase Gate (`pnpm verify`)
