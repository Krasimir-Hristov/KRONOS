# KRONOS v2 — Поетапен План за Разработка (ROADMAP.md)

Всеки етап се изгражда стъпка по стъпка по модела **Contract-First -> 4 Git Worktrees -> `pnpm verify` -> 1 PR към CodeRabbit -> Образователен разбор -> Merge в `main`**.

---

## Фаза 0: Конституция, Skills, Верификация & 4 Git Worktrees
**Цел:** Непробиваема инженерна основа, автоматични гардове и изолирана среда за паралелна работа на агентите.
- [x] Верификация на Next.js 16.4 правила през Context7 и `node_modules/next/dist/docs/`.
- [x] `AGENTS.md`, `ROADMAP.md` и `.coderabbit.yaml`.
- [x] Инсталиране на официални Next.js / React skills (`vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`) + собствени skills (`kronos-architecture`, `next-16-cache-components`, `kronos-worktrees`).
- [x] Инсталиране на базови пакети (Zod, Supabase SSR, LangGraph/LangChain, `motion`, `next-intl`, `lucide-react`, Vitest, `server-only`).
- [x] Автоматичен архитектурен одитор `scripts/verifyArchitecture.mjs` + `vitest.config.mts` + строг ESLint (`no-explicit-any`) + `pnpm verify`.
- [x] Създаване на 4-те Git Worktrees (`kronos-frontend`, `kronos-backend`, `kronos-testing`, `kronos-security`).
- **Критерий за завършване:** `pnpm verify` преминава с 0 грешки, PR `chore/phase-0-foundation` готов за преглед и merge.

---

## Фаза 1: Фундамент — Supabase v2 Схема, Auth + PIN, `src/proxy.ts` & `next-intl`
**Цел:** Работеща защитена база данни, двоен вход (Email+Парола + PIN), локализация `bg/en/el/de` и общи UI примитиви.
- [ ] Supabase v2 SQL миграция с пълни RLS политики (`auth.uid()`):
  - `profiles` (`role`, `preferred_locale`, `pin_hash`, `pin_failed_attempts`, `pin_locked_until`);
  - `user_tool_permissions` (RBAC по отдели за бъдещ семеен достъп);
  - `knowledge_collections` (Namespaces: `personal_docs` по подразбиране);
  - `documents` (`storage_provider` готов за Cloudflare R2, безсрочно пазене) + `document_chunks` (`pgvector(1536)` HNSW + `'simple'` unaccent FTS + RRF RPC функция);
  - `user_memories` (`pgvector(1536)` безсрочна лична памет и попълнени формуляри);
  - `vault_items` (`AES-256-GCM` криптирани тайни, без embeddings);
  - `chat_sessions` + `chat_messages` (1-годишно запазване, заглавия + преименуване);
  - LangGraph Postgres Checkpointer таблици за HITL.
- [ ] Изчистване на стари тестови акаунти в Supabase Auth и еднократно сървърно seed-ване на реалния админ профил + хеширан PIN (без записване на пароли/PIN в git!).
- [ ] `src/proxy.ts` (CVE-2025-29927 allowlist header scrubbing) + Auth/PIN Route Handlers (`/api/auth/login`, `/api/auth/pin`, `/api/auth/lock`, `/api/auth/logout`) + `requireAuthAndPin()` DAL guard.
- [ ] `next-intl` конфигурация (`bg`, `en`, `el`, `de`, cookie + `profiles.preferred_locale`) и преизползваеми UI примитиви (`src/components/ui/`: `ConfirmDialog`, `StatusBanner`, `CopyButton`, `Button`, `Modal`).
- [ ] Security & Unit тестове (header scrubbing, PIN crypto/brute-force, Zod env & auth схеми).
- **Критерий за завършване:** Работещ вход с Email+Парола -> PIN -> защитен Workspace на 4 езика, `pnpm verify` 0 грешки, 1 PR към CodeRabbit.

---

## Фаза 2: RAG Сейф (`/documents`), Storage Адаптер и Контекстно Индексиране
**Цел:** Надеждно качване, OCR/разчитане, чанкване с контекстни хедъри, многоезично търсене и пълно изтриване (Hard Purge).
- [ ] Изолиран `src/features/storage/` (`storageDal.ts` върху Supabase Storage bucket `kronos-vault`, готов за Cloudflare R2) + signed URLs + Hard Purge Everywhere.
- [ ] OpenRouter клиент с **Primary -> Fallback** моделна верига и ясна детекция при недостъпен OpenRouter (`aiModelsConfig.ts` + `openRouterClient.ts`).
- [ ] Ingestion пайплайн: PDF/Image OCR (Vision модел с fallback) -> автоматични метаданни (`title`, `doc_type`, `sender`, `doc_date`, `tags[]`, `language`) -> чанкване по страници с **Contextual Retrieval** хедъри -> `pgvector` embeddings.
- [ ] Страница `/documents`: масов Drag & Drop upload, избор на колекция, класическо търсене (работи и без OpenRouter!), преглед/сваляне и изтриване с `ConfirmDialog`.
- [ ] Unit & Security тестове (storage path traversal защита, Hard Purge, chunking & fallback).
- **Критерий за завършване:** Качваш реални PDF/снимки (напр. `Mietvertrag`, `Kontoauszug`) и ги търсиш мигновено на BG/DE/EL/EN, `pnpm verify` 0 грешки, 1 PR към CodeRabbit.

---

## Фаза 3 (MVP Кулминация): Жив Чат, Jev + LangGraph Супервайзър, Диктовка, Скрийншоти & Split-Screen
**Цел:** Реално работещ личен супер-агент в Production (Vercel), който спестява време всеки ден.
- [ ] **LangGraph Supervisor + Postgres Checkpointer + Jev Fast-Router (1.5s timeout + fallback)** + Plug-and-Play `DepartmentDefinition` регистър с RBAC проверка.
- [ ] Първи 2 реални отдела:
  1. `documents-bureaucracy` (Scoped: `personal_docs` + `user_memories` — хибриден RRF поиск, Jev reranking, скрийншот-към-попълване с 1-click Copy стойности и точни цитати по страници);
  2. `general-assistant` (Scoped: `user_memories` — ежедневен разговор, Vision анализ, директно запазване на документ в RAG при команда).
- [ ] **Жив Dark Obsidian UI:** `NeuralNetworkCanvas` фон (спокойно бавно движение в покой -> по-бързо и ярко пулсиране при мислене), стрийминг отговори, **сървърна диктовка (`/api/stt`)**, **`Ctrl+V` скрийншот / прикачване на файлове**, **Split-Screen Document Viewer** (Desktop 50/50 + Mobile Drawer с Download, Print, Fullscreen, Open in New Tab).
- [ ] Чат история (1-годишно запазване, автоматично AI заглавие + ръчно преименуване и изтриване с `ConfirmDialog`).
- [ ] Автоматично тихо извличане на **Long-Term Memory** (лични факти + попълнени формуляри с бадж *„Запомнено“* + Undo) и минимални страници `/memory` и `/vault` (**UI-Only Step-Up PIN** + `AES-256-GCM` за пароли + безопасна карта-линк в чата).
- [ ] Production деплой във **Vercel** + проверка на реални сценарии (*Wohngeld* скрийншот + `Kontoauszug` сваляне).
- **Критерий за завършване:** Пълно работещо Production MVP, `pnpm verify` 0 грешки, 1 PR към CodeRabbit.

---

## Фаза 4: Двупосочен Гласов Разговор (Voice Mode — STT + TTS през OpenRouter)
**Цел:** Естествен разговор с глас (питаш с глас -> KRONOS отговаря с глас) изцяло през OpenRouter модели (без ElevenLabs), изолиран като модулен toggleable feature.
- [ ] Сървърен TTS маршрут (`/api/tts`) през OpenRouter (с Primary -> Fallback моделна верига и Zod валидация).
- [ ] Клиентски модул `src/features/voice/` (Voice Conversation Mode бутон в чата: запис -> STT -> LangGraph -> стриймван аудио отговор + визуална реакция на `NeuralNetworkCanvas` при говорене).
- [ ] Оценка на качеството и латентността на български, гръцки, английски и немски (с feature flag за лесно включване/изключване или премахване).
- **Критерий за завършване:** Плавен двупосочен гласов разговор на мобилно и десктоп, `pnpm verify` 0 грешки, 1 PR към CodeRabbit.

---

## Фаза 5+: Разширяване на Екосистемата (Plug-and-Play Отдели, Семейство & R2)
**Цел:** Добавяне на нови отдели и мащабиране без докосване на ядрото.
- [ ] **Нови Plug-and-Play Отдели (по един PR на отдел):**
  - *YouTube Studio Отдел* (HITL чернови, фонова видео обработка);
  - *Адвокатски Отдел* (колекция `german_laws` + контролиран достъп до `personal_docs`);
  - *Имейл / Календар Отдел*.
- [ ] **Admin Dashboard & Семеен достъп:** Създаване/управление на акаунти за семейството (`el` за жена ти, профили за децата) и матрица за включване/изключване на конкретни отдели и колекции.
- [ ] **Storage миграция към Cloudflare R2** (смяна на провайдъра в `storageDal.ts` без промяна на UI/RAG).
- [ ] **Ново фирмено лого на KRONOS** (символика на бога на времето).
