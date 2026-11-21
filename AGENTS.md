# KRONOS (Κρόνος) — Инженерна Конституция и Продуктов Закон (AGENTS.md)

Този документ е върховният архитектурен, продуктов и инженерен закон за проекта **KRONOS**. Всеки AI агент (Оркестратор, Frontend, Backend, Testing, Security) и всеки разработчик прочита и спазва тези правила без изключение.

---

## 1. Продуктова Същност и Мащабируема Архитектура

**KRONOS** е лична, високо-мащабируема AI платформа (**Супервайзър + Plug-and-Play Отдели + Многоезичен RAG Сейф**), изградена върху **Next.js 16.4**, **TypeScript**, **Tailwind CSS v4**, **Supabase (Postgres 17 + `pgvector` + Storage + Auth)**, **LangGraph / LangChain** и **OpenRouter** (деплой във **Vercel**).

### Архитектурни Принципи
1. **LangGraph + LangChain Супервайзър с Human-in-the-Loop (HITL):**
   - Централният Супервайзър използва **Jev Fast-Router (`/api/alpha/decisions`, таймаут `1.5s`)** с автоматичен fallback към бързия OpenRouter модел.
   - State-ът на LangGraph се персистира чрез **Supabase Postgres Checkpointer**, за да могат бъдещи и текущи отдели да правят HITL паузи (`interrupt` / `resume`) в serverless среда на Vercel.
   - Всеки отдел е изолиран **Plug-and-Play** модул (`src/features/departments/<departmentName>/`) със стандартен `DepartmentDefinition` контракт и RBAC ID (`user_tool_permissions`).
2. **Индустриален Namespaced RAG (`1 pgvector` + `knowledge_collections` + Contextual Embeddings):**
   - Всички вектори живеят в една Postgres 17 + `pgvector` таблица (`document_chunks`), логически разделена на **колекции (`knowledge_collections`)** (напр. `personal_docs`, а по-късно `german_laws`, `youtube_assets`, `family_shared`).
   - **Principle of Least Privilege:** Супервайзорът **не чете директно** векторната база. Всеки отдел има собствен **Scoped Retriever** само до разрешените си колекции.
   - При индексиране се прилага **Contextual Retrieval** (контекстен хедър към всяко парче: колекция, заглавие, изпращач, дата, страница) и **Многоезичен Hybrid Search (RRF)**: `pgvector` HNSW (cross-lingual търсене между BG/EL/DE/EN) + PostgreSQL `'simple'` unaccent Full-Text за точни кодове (`IBAN`, `Steuer-ID`, `Wohngeld`, `ΑΦΜ`, `ЕГН`).
3. **Срокове за Пазене на Данните:**
   - **Документи (`documents`, `document_chunks`) и Лична памет (`user_memories`, вкл. попълнени формуляри):** **БЕЗСРОЧНО** пазене до изрично ръчно изтриване (Hard Purge).
   - **Чат история (`chat_sessions`, `chat_messages`):** **минимум 1 година (365 дни)** с автоматично генерирано заглавие и възможност за ръчно преименуване и изтриване.
4. **Изолиран Storage Адаптер:**
   - Всички файлови операции минават единствено през `src/features/storage/server.ts` (`storageDal.ts`) с колона `storage_provider` (`'supabase'` в MVP -> готова миграция към `'cloudflare_r2'` без промяна в UI/AI кода).
   - **Hard Purge Everywhere:** Изтриване на документ трие едновременно физическия файл от Storage, всички `document_chunks`, реда в `documents` и кешираните референции.

---

## 2. Верифицирани Правила за Next.js 16.4 & React 19

> Проверени директно спрямо Context7 (`/vercel/next.js/v16.4.5`) и локалната документация в `node_modules/next/dist/docs/`.

1. **Строга Забрана за `middleware.ts` — Само `src/proxy.ts`:**
   - В Next.js 16 мрежовият периметър е единствено `src/proxy.ts` с експорт `export const proxy = (request: NextRequest) => ...` (или `export function proxy`) и статичен `export const config = { matcher: [...] }`.
   - Защита срещу **CVE-2025-29927 (Allowlist Header Scrubbing):** Клонирай `new Headers(request.headers)`, изтривай входящи `x-*` хедъри (задължително `x-middleware-*`), като запазваш единствено allowlist хедърите за Server Actions / Vercel CSRF (`x-forwarded-host`, `x-forwarded-proto`, `x-forwarded-for`, `x-real-ip`), и подавай чистите хедъри през `NextResponse.next({ request: { headers } })`.
   - `proxy.ts` се изпълнява изолирано от render кода — не разчитай на споделени глобални променливи.
2. **Стриктни Правила за `cacheComponents: true` (`next.config.ts`):**
   - При **React рендериране** (`page.tsx`, `layout.tsx`, Server Components) всяко четене на динамични request данни (`cookies()`, `headers()`, `searchParams`, потребителска сесия) **ТРЯБВА** да бъде обвито в `<Suspense>` граница (четенето им извън `<Suspense>` при рендериране причинява build грешка). **Изключение:** Route Handlers (`src/app/api/**/route.ts`) и Server Actions не рендерират JSX и четат `await cookies()` / `await headers()` директно без `<Suspense>`.
   - **Никога** не прави top-level `await` на сесия/бисквитки директно в `layout.tsx` — изнеси проверката в отделен компонент (напр. `<AuthGate />`) вътре в `<Suspense>`.
   - **Забранени** са старите route segment конфигурации `export const dynamic`, `export const revalidate` и `export const fetchCache` (несъвместими с `cacheComponents: true`). Използвай `'use cache'`, `'use cache: private'`, `cacheLife()` и `cacheTag()`.
   - Никога не извиквай `cookies()` или `headers()` вътре в обикновен `'use cache'` — използвай `'use cache: private'` или подай извлечен примитивен `userId` като аргумент.
3. **Async Request APIs & React 19:**
   - `params`, `searchParams`, `cookies()`, `headers()` и `draftMode()` винаги се `await`-ват.
   - Елиминирай async водопадите: независими заявки се пускат паралелно с `Promise.all()`.
   - Използвай `next/image` за изображения и `next/dynamic` за тежки клиентски библиотеки (напр. PDF viewer / Canvas модули).

---

## 3. Именуване, Модулност, Separation of Concerns & UI Стандарт

1. **Именуване на Файлове и Символи (Задължителен Стандарт):**
   - **React UI компоненти:** **`PascalCase.tsx`** (напр. `NeuralNetworkCanvas.tsx`, `ConfirmDialog.tsx`) и **задължително дефинирани като Arrow Functions** (`const MyComponent: React.FC<Props> = () => { ... }`). Използването на `function` за React компоненти е **забранено**!
   - **Logic / Helper / Hook / DAL / Schema / Config / Test файлове:** **`camelCase.ts`** / **`camelCase.test.ts`** (напр. `aiModelsConfig.ts`, `useDictation.ts`, `documentDal.ts`, `aesGcmCrypto.ts`).
   - **Единствено изключение за имената на файлове:** Системните Next.js App Router файлове в `src/app/` (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`, `icon.tsx`, `apple-icon.tsx`, `manifest.ts`), `src/proxy.ts`, `src/i18n/request.ts` и `messages/*.json`. Дори в тях React компонентите вътре **пак са Arrow Functions**!
2. **Лимит на Размер на Файл:**
   - **Максимум 300 реда на файл** в `src/` (автоматично проверявано от `scripts/verifyArchitecture.mjs`). При приближаване на лимита файлът се разделя логически на по-малки модули.
3. **Separation of Concerns & Двойна Врата за Всеки Feature (`src/features/<featureName>/`):**
   - Вътрешна структура на модул:
     - `components/` — чисти UI компоненти (`PascalCase.tsx`, без директни DB заявки);
     - `hooks/` — клиентски state, fetch и side-effects (`use*.ts`);
     - `schemas/` — Zod контракти и типове (`*Schema.ts`);
     - `dal/` — достъп до Supabase / Storage / външни API-та (задължително `import 'server-only';`);
     - `utils/` — чисти детерминистични функции (`camelCase.ts`).
   - **Двойна публична врата (чист рефакторинг + оптимален Turbopack tree-shaking):**
     - `src/features/<featureName>/index.ts` — **само публични client-safe named exports** (`export { MyComp } from './components/MyComp'`). Забранено е `export *` и са забранени сървърни/DAL експорти!
     - `src/features/<featureName>/server.ts` — **само `server-only` експорти** (DAL, LangGraph възли, сървърни помощници).
   - **Забрана за Deep Imports:** Външен код импортира от даден feature **единствено** през `@/features/<featureName>` или `@/features/<featureName>/server`.
4. **DRY & Преизползваеми UI Примитиви (`src/components/ui/`):**
   - Общите елементи (`ConfirmDialog`, `StatusBanner`, `CopyButton`, `Button`, `Modal`, `Spinner`) живеят в `src/components/ui/` и се преизползват навсякъде без дублиране на код.
   - **Задължителен `ConfirmDialog`:** Всяко изтриване или необратимо действие (документ, лична памет, парола, чат) **задължително** отваря стилизиран `ConfirmDialog` за потвърждение.
5. **Tailwind CSS v4, Анимации, A11y & Многоезичност:**
   - Градиенти само в Tailwind v4 синтаксис: **`bg-linear-to-*`** (`bg-gradient-to-*` е забранен).
   - Анимации с `motion/react` (`motion`).
   - Семантичен HTML5 (`<main>`, `<nav>`, `<section>`, `<article>`, `<aside>`, `<header>`), задължителен `aria-label` на интерактивните елементи, уникални `Metadata` на всяка страница.
   - Всички UI текстове минават през `next-intl` (поддържани локали: `bg`, `en`, `el`, `de`, запазвани в cookie и `profiles.preferred_locale`, без URL префикси).

---

## 4. Строг TypeScript, Двойна Zod Бариера, Устойчивост и Сигурност

1. **Абсолютна Забрана за `any`:** Използвай строги интерфейси, `unknown` + Type Guards, генерираните Supabase типове и `z.infer<typeof schema>`.
2. **Двойна Zod Бариера + `try/catch`:**
   - Всяка асинхронна операция, Route Handler, Server Action, `.env` валидация и всеки отговор от външен AI модел / OpenRouter **задължително** се обвива в `try/catch` и се парсва с `schema.safeParse()`.
   - Никога не връщай сурови stack traces или системни DB грешки към клиента — винаги локализирани, ясни съобщения.
3. **Устойчивост при Срив на Модел или OpenRouter (Fallback Chain & Graceful Degradation):**
   - Всеки моделен слот (router, fast chat, vision/OCR, STT, embeddings) има **Primary + Fallback** модел в `src/config/aiModelsConfig.ts` (презаписваеми през `.env`).
   - При 429/5xx/timeout системата автоматично пробва Fallback модела.
   - Ако целият **OpenRouter** е недостъпен, приложението **не спира да работи**: показва ясен статус банер (`StatusBanner`), докато не-AI функциите (`/documents` класическо търсене, преглед, сваляне, печат, `/vault`, `/memory`) остават 100% работоспособни.
4. **Защита на Пароли (`AES-256-GCM` — UI-Only Secret Reveal):**
   - Личните факти (`user_memories`: телефон, адрес, IBAN, наем, минали формуляри) са достъпни за AI агента.
   - Паролите (`vault_items` с `is_secret = true`) се криптират на сървъра с **AES-256-GCM** (уникален `IV` + `Auth Tag`), **НИКОГА** не се записват в прав текст, **НИКОГА** не се векторизират в `pgvector` и **НИКОГА** не се изпращат към OpenRouter/LLM. Декриптират се единствено сървър -> UI след **Step-Up PIN**.
5. **Defense in Depth & Без Тайни в Git:**
   - Всеки защитен DAL метод и Route Handler извиква сървърна проверка `requireAuthAndPin()` (+ проверка на `user_tool_permissions` за отделите).
   - Всяка Supabase таблица и частният Storage bucket имат стриктни **RLS политики (`auth.uid()`)**.
   - **Никога** не записвай реални пароли, PIN кодове или API ключове в git-tracked файлове (`AGENTS.md`, `ROADMAP.md`, seed файлове или тестове).

---

## 5. Топология на 4-те Git Worktrees, Роли & Задължителен 8-Стъпков Протокол за Всяка Фаза

> **КРИТИЧНО ПРАВИЛО ЗА ВСЕКИ НОВ ЧАТ:** Потребителят отваря **нов чат за всяка фаза/фийчър**. При подкана от типа *„Направи план за Фаза X“* или *„Започваме Фаза X“* Оркестраторът **НЕ пита как работим** и **НЕ пише код предварително**, а веднага изпълнява следния **8-стъпков протокол** автоматично:

### Задължителен 8-Стъпков Цикъл на Всяка Фаза
1. **Зареждане на контекст (тихо, преди плана):** Прочети `ROADMAP.md`, `.agents/skills/kronos-lessons/SKILL.md`, `.agents/skills/kronos-architecture/SKILL.md`, `.agents/skills/next-16-cache-components/SKILL.md` и провери реалния статус на кода/базата.
2. **План на фазата (Артефакт с `Proceed` — НУЛА код преди одобрение!):** Представи структуриран план на български, който **ВИНАГИ** включва:
   - Точния обхват на фазата и архитектурните решения (по `ROADMAP.md`);
   - **Точния списък на Contract-First файловете** (SQL миграция, DB типове, Zod схеми, TypeScript интерфейси, API request/response формати);
   - **Индивидуален брийф (таблица/списък) за всеки от 4-те агента** (`Frontend`, `Backend`, `Testing`, `Security`) — точно кои файлове ще създаде/редактира всеки агент (0 припокриване).
3. **Contract-First Commit & Преглед:** Едва след одобрение на плана Оркестраторът създава фазовия клон `feat/phase-X-<name>` от `main`, написва и комитва **само Contract-First файловете**, показва ги на потребителя с кликаеми линкове (за бърз преглед) и синхронизира 4-те worktrees (`wt/frontend`, `wt/backend`, `wt/testing`, `wt/security`) върху този commit.
4. **Паралелно изпълнение от 4-те агента:** Оркестраторът стартира паралелно 4-те агента в техните 4 worktree папки (всеки наследява избрания от потребителя модел, освен ако не е указан друг) със задължителна инструкция да прочетат `AGENTS.md` и `.agents/skills/kronos-lessons/SKILL.md`.
5. **Обединяване, Pre-PR Security Gate & `pnpm verify`:** Оркестраторът мърджва `wt/backend` -> `wt/frontend` -> `wt/testing` -> `wt/security` в `feat/phase-X-<name>`, пуска **Security Agent** да одитира обединения diff по `kronos-lessons/SKILL.md` + `AGENTS.md`, и изпълнява `pnpm verify` до **0 грешки**.
6. **1 Общ PR към `main`:** Проверка за 0 изтекли тайни -> push -> отваряне на 1 PR към `main` за CodeRabbit.
7. **Интерактивен CodeRabbit Разбор + `kronos-lessons`:** По Раздел 7 — обобщение + въпросник точка по точка с индустриални решения -> прилагане -> `pnpm verify` -> push -> задължителна дестилация на повтаряемите уроци (1 ред на правило, макс. 250 реда) в `.agents/skills/kronos-lessons/SKILL.md`.
8. **Образователен Разбор (По Раздел 8):** Подробна карта файл по файл (кой агент го е писал, какво прави, Exports -> Imports -> Usage, state и сигурност).

### 4 Паралелни Изолирани Worktrees (Зони на Собственост)

| Worktree Папка | Клон | Зона на Собственост (Zero Conflicts) | Роля / Инструкция за Агента |
| :--- | :--- | :--- | :--- |
| `d:\myProjects\kronos-frontend` | `wt/frontend` | `src/components/**`, `src/features/*/components/**`, `src/features/*/hooks/**`, `src/features/departments/*/components/**`, `src/features/departments/*/hooks/**`, `src/app/**/page.tsx`, `src/app/**/layout.tsx`, `messages/*.json` | **Frontend Agent:** Строи достъпни, мобилно-адаптивни React 19 UI компоненти (`PascalCase.tsx`, Arrow Functions, `motion/react`, `bg-linear-to-*`, `next-intl`, `<Suspense>` за `cacheComponents`). Консумира единствено договорите от `schemas/` и API/hooks. Никога не докосва `dal/` или `supabase/`. |
| `d:\myProjects\kronos-backend` | `wt/backend` | `src/features/*/dal/**`, `src/features/*/server.ts`, `src/features/departments/**` *(без `components/**` и `hooks/**`)*, `src/app/api/**`, `src/lib/**`, `src/config/**`, `src/proxy.ts`, `supabase/migrations/**` | **Backend Agent:** Строи `server-only` DAL, Route Handlers, `src/proxy.ts`, OpenRouter fallback клиента, LangGraph Supervisor + Scoped отдели, `storageDal`, `AES-256-GCM` и Supabase миграции с RLS. Двойна Zod бариера + `requireAuthAndPin()` навсякъде. |
| `d:\myProjects\kronos-testing` | `wt/testing` | `src/**/*.test.ts` *(без `src/test/security/**`)*, `src/test/mocks/**` | **Testing Agent:** Пише целенасочени Vitest unit и contract тестове за Zod схеми, криптография, fallback вериги, RAG RRF логика, storage адаптери и LangGraph рутиране (само по изричен план на фазата). |
| `d:\myProjects\kronos-security` | `wt/security` | `src/test/security/**`, `scripts/verifyArchitecture.mjs` | **Security & Arch Agent:** Одитира и тества CVE-2025-29927 header scrubbing, PIN brute-force / tampering, RLS изолация, забрана за изтичане на пароли към AI/вектори, prompt injection защити и автоматизирани архитектурни проверки. |

---

## 6. Задължителен Phase Gate (`pnpm verify`)

Нито една фаза или PR не се счита за завършена, докато `pnpm verify` не премине с **0 грешки**:
1. `pnpm verify:arch` — автоматична проверка на архитектурата (`scripts/verifyArchitecture.mjs`: забрана за `middleware.ts`, лимит 300 реда вкл. `.css`, `PascalCase.tsx` / `camelCase.ts`, Arrow Functions за компоненти, без `bg-gradient-to-*`, без cross-feature deep imports — aliased и относителни).
2. `pnpm typecheck` — `next typegen && tsc --noEmit`.
3. `pnpm lint` — `eslint` (със забрана за `any`).
4. `pnpm test` — `vitest run` (преминава и при 0 теста в Фаза 0 чрез `--passWithNoTests`).
5. `pnpm build` — успешен production build на Next.js 16 (`cacheComponents: true`).

---

## 7. Закон за CodeRabbit & PR Review (Интерактивен Разбор по Индустриални Стандарти)

При постъпили бележки от CodeRabbit или външно ревю Оркестраторът спазва следния строг протокол:
1. **Абсолютна забрана за тихо/автоматично поправяне:** Никога не се нанасят корекции и не се пушва код преди бележките да бъдат прочетени внимателно и обсъдени с потребителя.
2. **Кратко общо обобщение (Summary):** Първо се представя стегнат списък на всички отбелязани проблеми (разделени на реални проблеми vs дребни/фалшиви тревоги), за да има пълна картина.
3. **Разбор бележка по бележка (като интерактивен въпросник):** За всяка бележка поотделно Оркестраторът обяснява на български (стегнато, но детайлно и по същество):
   - **Какъв е реалният проблем** (конкретен файл, ред и риск);
   - **Защо е важно** (реалното влияние върху сигурност, надеждност, архитектура или производителност);
   - **Няколко конкретни решения, базирани на реални IT индустриални стандарти** (никога „набързо“ или временни кръпки), с ясно обоснована препоръка `(Recommended)` и опция „Игнорираме / Отлагаме“, когато е уместно.
4. **Изпълнение едва след избор на потребителя:** Едва след като всички точки са решени заедно, се прилагат уговорените решения, преминава `pnpm verify` (0 грешки) и чак тогава се пушва към PR-а.
5. **Задължително обновяване на `kronos-lessons` (Памет между чатове):** След всяко завършено CodeRabbit ревю Оркестраторът **ЗАДЪЛЖИТЕЛНО** дестилира повтаряемите уроци като резюме (1 ред на правило, никога суров copy-paste, строг лимит **<= 250 реда** с периодична компресия) в `.agents/skills/kronos-lessons/SKILL.md`. При стартиране на всяка нова фаза (в нов чат) Оркестраторът и 4-те worktree агента прочитат `.agents/skills/kronos-lessons/SKILL.md`, а `Security Agent` го минава като Pre-PR Gate преди отваряне на PR.

---

## 8. Закон за Обучение и Подробен Разбор след Всяка Фаза (Educational Phase Debrief)

След приключването на **всеки фийчър или фаза** Оркестраторът **ЗАДЪЛЖИТЕЛНО** представя на потребителя структуриран, подробен разбор на български език, включващ:
1. **Карта на файловете (Файл по файл):** Всеки създаден или променен файл, **кой агент/worktree** го е изготвил, **какво прави** и **защо е нужен**.
2. **Карта на връзките (Exports -> Imports -> Usage):** Какви основни компоненти/функции експортва файлът, къде се импортват и как се свързват помежду си.
3. **Поток на данните, State & Сигурност:** Как се управлява състоянието (Server vs Client, Zustand/Hooks/Cookies/DB), как минават заявките и на кои ключови детайли или потенциални капани трябва да се обръща внимание при бъдещо развитие.

---

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
