# KRONOS (Κρόνος) — Инженерна Конституция (AGENTS.md v4)

Този документ е върховният инженерен закон за проекта **KRONOS** (Личен & Семеен AI Асистент и Архив). Всички правила тук имат **най-висок приоритет** за това хранилище и се спазват без нито едно изключение.

---

## 1. Приоритет и Именуване на Файлове (Строг Закон)

> **Override над глобални конвенции:** В проекта `kronos` конвенцията `camelCase.ts` / `PascalCase.tsx` и задължителните Vitest unit тестове в края на всяка фаза имат изричен приоритет пред всякакви глобални `kebab-case` или `no-unit-tests` правила.

1. **Логически файлове (`camelCase.ts`):**
   - Всички не-компонентни файлове (агенти, рутери, DAL, Zod схеми, hooks, конфигурации, помощни функции) **ВИНАГИ** носят имена в `camelCase.ts` — напр. `jevRouter.ts`, `traditionalSupervisor.ts`, `documentDal.ts`, `useChatStream.ts`, `uploadSchema.ts`.
   - Unit тестовете носят съответното име `camelCase.test.ts` (напр. `headerScrubber.test.ts`, `jevRouter.test.ts`).
   - Публичният експорт на всеки feature модул е `index.ts`.
2. **React Компоненти (`PascalCase.tsx`):**
   - Всички React компоненти и контекст провайдъри с JSX **ВИНАГИ** носят имена в `PascalCase.tsx` — напр. `DocumentViewer.tsx`, `ChatComposer.tsx`, `PinLockScreen.tsx`, `ShoppingListCard.tsx` (и `PascalCase.test.tsx` при компонентни тестове).
3. **Единствени разрешени системни изключения:**
   - Системните файлове на Next.js 16 App Router в `src/app/`: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx`, `route.ts`, `template.tsx`, `default.tsx`, `manifest.ts`, `robots.ts`, `sitemap.ts`, `icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx`.
   - Мрежовият прокси файл `src/proxy.ts`.
   - Директорията `.agents/skills/<skill-name>/SKILL.md`, която следва системния стандарт на Antigravity.

---

## 2. Модулна Архитектура, Компонентен Стандарт и Лимит на Редове

1. **Твърд лимит от 250–300 реда на файл:**
   - Нито един файл в `src/` не може да надвишава **300 реда** (проверява се автоматично от `pnpm verify:arch`).
   - Щом файл доближи **250 реда**, той се разделя на по-малки фокусирани модули преди добавяне на нова функционалност, за да не се чупи работещ код.
2. **Feature-базирана изолация (`src/features/<featureName>/`):**
   - Всеки домейн живее изолирано в `src/features/<featureName>/` със собствени поддиректории (`components/`, `dal/`, `schemas/`, `hooks/`, `agents/`, `types/`) и експортира публичния си интерфейс **само** през `src/features/<featureName>/index.ts`.
   - **Забранени са дълбоки импорти** между различни features (напр. `@/features/documents/dal/documentDal` от друг модул е забранено — импортира се само от `@/features/documents`).
3. **Data Access Layer (DAL):**
   - Всички заявки към Supabase (PostgreSQL / pgvector / Auth) и Cloudflare R2 (S3 Presigned URLs) са изолирани в `dal/` модули със сървърна защита (`import 'server-only'`). UI компонентите никога не правят директни заявки към БД.
4. **React, A11y, SEO и Tailwind CSS v4:**
   - **Arrow Functions:** Всички React компоненти се дефинират като Arrow Functions (`export const MyComponent: React.FC<Props> = () => { ... }`). Забранено е използването на ключовата дума `function` за компоненти (дори в `page.tsx` и `layout.tsx` се дефинира `const Page: React.FC = () => ...; export default Page;`).
   - **Семантичен HTML5 и Достъпност:** Използвай `<main>`, `<nav>`, `<section>`, `<article>`, `<header>`, `<aside>`. Всеки интерактивен елемент (`<button>`, `<a>`, `<input>`, `<select>`) **задължително** има смислен `aria-label`.
   - **SEO Метаданни:** Всяка страница (`page.tsx`) включва уникални `title` и `description` чрез Next.js `Metadata`.
   - **Tailwind CSS v4:** За градиенти **винаги** използвай новия v4 синтаксис `bg-linear-to-*` (напр. `bg-linear-to-br`, `bg-linear-45`). Класовете `bg-gradient-to-*` са строго забранени.
   - **Оптимизация:** Използвай `next/image` за изображения и `next/dynamic` за тежки клиентски библиотеки (напр. PDF preview / компресия).

---

## 3. Strict TypeScript & Двойна Zod Бариера

1. **Абсолютна забрана за `any`:**
   - Използването на `any` е строго забранено навсякъде в кода и тестовете. Използвай точни интерфейси или `unknown` със строги Type Guards / Zod парсване.
2. **Single Source of Truth за типовете:**
   - Типовете за данните се извличат директно от **Drizzle ORM** (`$inferSelect`, `$inferInsert`) и **Zod** (`z.infer<typeof mySchema>`). Не дублирай ръчни интерфейси, които могат да се разминат с базата данни.
3. **Двойна Zod Бариера + Задължителен `try/catch`:**
   - **Входна бариера:** Всеки API Route Handler, Server Action и конфигурационен модул валидира входа с `schema.safeParse()` в `try/catch` блок.
   - **Изходна AI/API бариера:** Всеки отговор от външен AI модел или услуга (OpenRouter Jev `/api/alpha/decisions`, Chat/OCR модели, Tavily/Serper, YouTube API, Open-Meteo) се валидира с `schema.safeParse()` в `try/catch`.
   - **Сигурни грешки:** Никога не връщай сурови системни грешки или stack traces към клиента — винаги връщай типизиран резултат с разбираемо за потребителя съобщение на **Български (BG)** или **Гръцки (EL)**.

---

## 4. Next.js 16 Security First (`src/proxy.ts` + Defense in Depth)

1. **Строга забрана за `middleware.ts`:**
   - Файл `middleware.ts` никога не трябва да съществува в проекта. Цялата периметърна защита се намира в `src/proxy.ts`.
2. **CVE-2025-29927 Allowlist Header Scrubbing:**
   - В `src/proxy.ts` (чрез `scrubExternalHeaders`) всички външни `x-*` хедъри (особено `x-middleware-subrequest`, `x-middleware-*`, `x-invoke-*`, `x-prerender-*`) се изтриват от входящата заявка.
   - Запазват се **единствено** доверените прокси хедъри на платформата (`x-forwarded-host`, `x-forwarded-proto`, `x-forwarded-for`, `x-real-ip`), за да работи коректно CSRF защитата на Next.js 16 Server Actions зад Vercel/Cloudflare.
3. **Двоен вход + Defense in Depth:**
   - Достъпът изисква **Supabase Auth сесия** (2 родителски профила) **плюс** верифициран **Банков ПИН** (криптиран `HttpOnly` cookie с 15-минутен sliding TTL при активност; отделен флаг `kidsLock` заключва приложението само в режим Детски Учител).
   - **Дублирана проверка:** Всеки Server Action, Route Handler и DAL метод повторно извиква сървърната проверка за сесия и ПИН — никога не се разчита само на `src/proxy.ts`.

---

## 5. AI Оркестрация & Graceful Degradation (Единствено OpenRouter)

1. **Единствен AI доставчик:** OpenRouter API (с централен регистър на моделите в `src/config/aiModelsConfig.ts`). Не се добавят директни SDK-та към отделни AI доставчици.
2. **Двуслойна Агентска Защита:**
   - **Слой 1 (`jevRouter.ts`):** Изпраща структуриран въпрос към `POST https://openrouter.ai/api/alpha/decisions` (`typesafe/jev-*`) с твърд таймаут `1500ms`. При `isGeneralChat = true` насочва директно към лек чат модел без описания на субагенти. При нужда от субагенти поддържа паралелно и последователно изпълнение в LangGraph (`GraphState.collectedFacts`) с твърд таван `MAX_STEPS = 4`.
   - **Слой 2 (`traditionalSupervisor.ts`):** Ако Jev ендпойнтът върне грешка или надвиши `1.5s`, `catch` блокът автоматично превключва към резервен модел в OpenRouter с класически `bindTools`.
   - **Слой 3 (Пълен срив на OpenRouter):** Ако целият OpenRouter е недостъпен, системата връща чисто двуезично съобщение (BG/EL), че AI услугите са временно недостъпни, докато целият не-AI слой (SQL/Full-Text търсене в `/documents`, преглед/сваляне/принтиране от Cloudflare R2 и списъкът за пазаруване) продължава да работи на **100%**.

---

## 6. Задължителен Phase Gate (Критерий за завършена стъпка)

Нито една задача или фаза не се счита за завършена, докато всички 5 проверки в `pnpm verify` не преминат с **0 грешки**:
1. `pnpm verify:arch` — проверка за лимит от 300 реда, `camelCase.ts` / `PascalCase.tsx`, липса на `middleware.ts`, липса на дълбоки cross-feature импорти и липса на `bg-gradient-to-*`.
2. `pnpm typecheck` — `tsc --noEmit` със стриктна конфигурация.
3. `pnpm lint` — `eslint` без предупреждения и без `any`.
4. `pnpm test` — `vitest run` с покритие на критичната бизнес логика, Zod схемите и защитните слоеве.
5. `pnpm build` — успешен production билд на Next.js 16.
