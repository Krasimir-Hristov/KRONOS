# KRONOS (Κρόνος) — Пътна Карта на Проекта (Roadmap v4)

Този документ отразява актуалния прогрес, завършените етапи и предстоящите фази на KRONOS според Архитектурен План v4 и Инженерната Конституция (`AGENTS.md`).

---

## 📊 Общ Преглед на Прогреса

```mermaid
flowchart LR
    P0["Фаза 0: Ядро & Конституция"] --> P1["Фаза 1: База данни, ПИН & R2"]
    P1 --> P2["Фаза 2: Сейф /documents & OCR"]
    P2 --> P3["Фаза 3: AI Чат, Камера & Jev"]
    P3 --> P4["Фаза 4: Първи Субагенти & /family"]
    P4 --> P5["Фаза 5: Пазаруване, Nano Banana & Учител"]
    P5 --> P6["Фаза 6+: Финанси, YouTube & GPS"]

    style P0 fill:#10b981,stroke:#059669,stroke-width:2px,color:#ffffff
    style P1 fill:#f59e0b,stroke:#d97706,stroke-width:3px,color:#000000
    style P2 fill:#1e293b,stroke:#475569,stroke-width:1px,color:#94a3b8
    style P3 fill:#1e293b,stroke:#475569,stroke-width:1px,color:#94a3b8
    style P4 fill:#1e293b,stroke:#475569,stroke-width:1px,color:#94a3b8
    style P5 fill:#1e293b,stroke:#475569,stroke-width:1px,color:#94a3b8
    style P6 fill:#1e293b,stroke:#475569,stroke-width:1px,color:#94a3b8
```

| Фаза | Име на Фазата | Статус | Фокус |
| :--- | :--- | :---: | :--- |
| **Фаза 0** | **Конституция, Skills & Next.js 16 Скелет** | ✅ **Завършена** | `AGENTS.md`, 4 скила, `verifyArchitecture.mjs`, `src/proxy.ts`, BG/EL i18n, Vitest, Turbopack Build |
| **Фаза 1** | **База Данни, Двоен Вход & Cloudflare R2** | ⏳ **Следваща** | Drizzle ORM + Supabase PostgreSQL (`pgvector(1536)` HNSW, FTS, `expires_at`), 15-мин Банков ПИН + Kids Lock, R2 S3 Presigned URLs |
| **Фаза 2** | **Сейф `/documents` & Веднага Качване** | 📋 Планирана | Качване на PDF/снимки, Конвертор Снимки ➔ PDF, Gemini Flash OCR, филтри, Split-Screen / Мобилен преглед, Принт, Изтриване |
| **Фаза 3** | **Личен AI Асистент `/chat` & Jev Диспечер** | 📋 Планирана | Чат за 2-та профила, 📷 Камера без запис, Whisper STT + TTS, `jevRouter.ts` (1.5s таймаут) + `traditionalSupervisor.ts` бекъп |
| **Фаза 4** | **Първи Субагенти & Семеен Център `/family`** | 📋 Планирана | LangGraph: `archiveSearchAgent`, `germanAntragAgent`, `archiveCleanupAgent`, `shoppingListAgent` + реално-времеви списък за покупки |
| **Фаза 5** | **Онлайн Пазаруване, Nano Banana & Детски Учител** | 📋 Планирана | `shoppingWebAgent` (Amazon/Otto/Idealo), `imageStudioAgent` (Nano Banana 2 / Pro с насочващи въпроси), `kidsTutorAgent` с ПИН катинар |
| **Фаза 6+**| **Финансов Съветник `/finance`, YouTube & GPS** | 📋 Планирана | `financeAdvisorAgent` (Kontoauszüge & Kassenbons), `youtubeDjAgent` (плейлисти), `localExplorerAgent` (GPS + Open-Meteo) |

---

## 📌 Детайлен Статус по Фази

### ✅ Фаза 0: Инженерна Конституция, Antigravity Skills & Next.js 16 Скелет (ЗАВЪРШЕНА)
- [x] **Върховна конституция (`AGENTS.md`)**:
  - Приоритет на `camelCase.ts` / `PascalCase.tsx` и Vitest пред глобалните конвенции.
  - Лимит 250–300 реда на файл, забрана за `any`, двойна Zod бариера, забрана за `middleware.ts`.
  - Двуслойна защита при AI грешки (Jev ➔ Backup Supervisor ➔ Graceful Degradation съобщение на BG/EL).
- [x] **4 специализирани Antigravity скила в `.agents/skills/`**:
  - `kronos-phase-gate` с автоматичен страж `verifyArchitecture.mjs` (тестване за `middleware.ts`, лимит на редове, конвенции и стари Tailwind класове).
  - `kronos-feature-scaffold` (шаблон за изолирани `src/features/<featureName>/` модули с `server-only` DAL).
  - `kronos-subagent-builder` (шаблон за Plug-and-Play субагенти за Jev и LangGraph).
  - `kronos-db-migration` (процедура за Drizzle ORM + Supabase MCP).
- [x] **Next.js 16 ядро & Мрежова защита**:
  - Мрежов периметър `src/proxy.ts` с Allowlist Header Scrubbing (`headerScrubber.ts`) срещу CVE-2025-29927 (запазва `x-forwarded-host` за Server Actions CSRF).
  - Изолация за `kronos_kids_lock` режим.
- [x] **Двуезичен интерфейс (🇧🇬 BG / 🇬🇷 EL) & App Shell**:
  - Строго типизиран речник (`bgDictionary.ts`, `elDictionary.ts`), `LanguageContext.tsx`.
  - Responsive App Shell (странично меню за компютър + долна лента с 4 икони за телефон).
  - Конфигуриран `QueryProvider` (TanStack Query v5) и PWA `manifest.ts`.
- [x] **100% преминат QA гейт (`pnpm verify`)**:
  - `verify:arch` ➔ 0 нарушения.
  - `typecheck` (TypeScript 6.0.3 strict) ➔ 0 грешки.
  - `lint` (ESLint 10 с забрана за `any`) ➔ 0 грешки.
  - `test` (Vitest unit тестове за хедъри, env и i18n) ➔ 8/8 успешни теста.
  - `build` ➔ чист Next.js 16 Turbopack production билд.
- [x] Първи къмит и пуш в GitHub: `https://github.com/Krasimir-Hristov/KRONOS.git` (клон `main`).

---

### ⏳ Фаза 1: База Данни, Двоен Вход & Cloudflare R2 (ПРЕДСТОЯЩА)
- [ ] **Drizzle ORM Схема за Supabase PostgreSQL**:
  - Таблица `profiles` (2 родителски профила + детски профили).
  - Таблица `documents` (заглавие, тип, подател, дата, година, месец, метаданни, суров OCR текст, статус).
  - `pgvector(1536)` колона `embedding` с HNSW индекс (`vector_cosine_ops`).
  - Твърдо B-Tree индексиране по `(owner_id, doc_type, doc_year, doc_month)` и `(expires_at)`.
  - Многоезичен Full-Text Search (GIN индекс с `'simple'` речник за немски, български и гръцки думи + IBAN номера).
  - Таблици за чат сесии (`chat_sessions`, `chat_messages`) и покупки (`shopping_items`).
  - Активиране на Row-Level Security (RLS) политики.
- [ ] **Двоен Вход (Supabase Auth + 15-мин Банков ПИН)**:
  - Supabase Auth вход (Email / Magic Link / Passkey).
  - Криптиран `HttpOnly` cookie за Банковия ПИН с 15-минутен sliding TTL при активност.
  - Отделен флаг `kronos_kids_lock` за заключване на приложението само в `/chat` за децата.
  - Помощна функция `requireAuthAndPin()` за Defense in Depth във всички Server Actions и DAL методи.
- [ ] **Cloudflare R2 интеграция (S3 Presigned URLs)**:
  - Качване директно от клиента към R2 без преминаване през 4.5 MB лимита на Vercel.
  - Защитено четене чрез временни Signed URLs.
  - Пълно паралелно изтриване (Supabase запис + Cloudflare R2 файл едновременно).
- [ ] Cron endpoint срещу заспиване на безплатния Supabase проект.
- [ ] Изпълнение на Phase Gate (`pnpm verify`).

---

### 📋 Фаза 2: Сейф `/documents` & Веднага Качване на Документи
- [ ] UI за качване на снимки и PDF документи с Drag-and-Drop и от камера на телефона.
- [ ] Вграден конвертор Снимки ➔ Един общ PDF (`pdf-lib` + `browser-image-compression`).
- [ ] Автоматичен OCR анализ с Gemini Flash през OpenRouter (разпознаване на Kontoauszug, молби, година/месец, краен срок `expires_at`).
- [ ] Бърза търсачка с комбинирани SQL филтри (по година, месец, тип, подател) + таб „🧹 За почистване“.
- [ ] Split-Screen преглед на десктоп и мобилен преглед на цял екран със системна поддръжка за бутон „Назад“.
- [ ] Принтиране, сваляне и масово изтриване от базата и R2 едновременно.

---

### 📋 Фаза 3: Личен AI Асистент `/chat`, Камера & Двуслоен Диспечер
- [ ] Чат интерфейс с разделени сесии за двата родителски профила (UI на 🇧🇬 BG и 🇬🇷 EL).
- [ ] Бутон 📷 Камера на телефон за моментален превод и разчитане на текст на място без задължителен запис в сейфа (+ бутон „📥 Запази в Архива“, ако е важен документ).
- [ ] Гласова диктовка (Whisper Large V3) и говорещ отговор (TTS).
- [ ] Слой 1: `jevRouter.ts` през OpenRouter `/api/alpha/decisions` (`typesafe/jev-*`) с таймаут `1500ms`.
- [ ] Слой 2: `traditionalSupervisor.ts` с автоматично резервно превключване при грешка/таймаут на Jev.
- [ ] Слой 3: Graceful Degradation съобщение при пълен срив на OpenRouter със запазване на 100% от не-AI функциите.

---

### 📋 Фаза 4: Първи Plug-and-Play Субагенти & Семеен Център `/family`
- [ ] LangGraph координация с поддръжка на общо състояние `GraphState.collectedFacts` и таван `MAX_STEPS = 4`.
- [ ] `archiveSearchAgent.ts` — хибридно търсене (100% точен SQL за извлечения + вектори за писма).
- [ ] `germanAntragAgent.ts` — разчитане на немски молби и извличане на чеклист с нужни документи.
- [ ] `archiveCleanupAgent.ts` — автоматично намиране на документи с изтекъл срок (`expires_at`) и безопасно изтриване след одобрение.
- [ ] `shoppingListAgent.ts` — гласово и текстово управление на споделения списък за супермаркет.
- [ ] Страница `/family` със синхронизиран в реално време списък за пазаруване.

---

### 📋 Фаза 5: Онлайн Пазаруване, Фото Студио (Nano Banana) & Детски Учител
- [ ] `shoppingWebAgent.ts` — търсене на реални оферти и цени в Amazon.de, Otto.de, Idealo.de (Tavily / Serper).
- [ ] `imageStudioAgent.ts` — генерация и редакция на снимки с Google Nano Banana 2 & Pro (`google/gemini-3.1-flash-image` / `google/gemini-3-pro-image`) с интерактивни насочващи въпроси (стил, пропорция, запазване на лица).
- [ ] `kidsTutorAgent.ts` — индивидуален учител за трите деца (знаещ класа и възрастта им) с опция за ПИН катинарче (Kids Lock) при предаване на устройството.

---

### 📋 Фаза 6+: Финанси, Музикален DJ & GPS Уикенд
- [ ] Страница `/finance` и `financeAdvisorAgent.ts` — месечен анализ на банковите извлечения (Kontoauszüge) и снимане на касови бележки (Kassenbons).
- [ ] `youtubeDjAgent.ts` — търсене на песни през официалното YouTube Data API v3 и създаване на семейни плейлисти.
- [ ] `localExplorerAgent.ts` — идеи за уикенда, времето (Open-Meteo) и събития по текущи GPS координати.
