---
name: kronos-lessons
description: Compact curated lessons learned from CodeRabbit PR reviews for KRONOS v2, plus strict self-maintenance rules for the Orchestrator (max 250 lines). ALWAYS load BEFORE coding in a new phase/chat, BEFORE opening a PR (Security Agent Pre-PR Gate), and AFTER resolving CodeRabbit findings.
---

# KRONOS v2 — Дестилирани Уроци от CodeRabbit (Institutional Memory)

## Протокол за Поддръжка (Задължителен за Оркестратора във всеки нов чат)

1. **Кога се обновява:** Веднага след приключване на всяко CodeRabbit PR ревю (след като потребителят е одобрил решенията точка по точка).
2. **Как се записва (Context Engineering):**
   - **НИКОГА** не копирай сурови коментари или дълги обяснения от CodeRabbit.
   - Дестилирай всеки повтаряем урок в **1 стегнат ред**: `- **[Област]** Не прави X -> Прави Y *(защо)*`.
   - Еднократни дребни печатни грешки **не** се записват.
3. **Твърд бюджет (<= 250 реда общо):**
   - Ако файлът наближи 250 реда, Оркестраторът го **компресира**: слива сходни правила и прехвърля механично проверимите правила директно в `scripts/verifyArchitecture.mjs`, `eslint.config.mjs` или Vitest тестове.
4. **Използване при нова фаза / нов чат:**
   - Оркестраторът включва в брийфа на всеки от 4-те worktree агента да прочете `AGENTS.md` и този файл преди писане на код.
   - `Security Agent` минава всички редове по-долу като **Pre-PR Gate** върху обединения diff преди отваряне на PR към CodeRabbit.

---

## Активни Уроци (Curated Checklist)

### Next.js 16 & CI
- **[Typecheck]** Не пускай само `tsc --noEmit` -> винаги `next typegen && tsc --noEmit` *(генерира `.next/types` за `LayoutProps`/`PageProps` при чист checkout/CI)*.
- **[Cache Components]** Не прилагай `<Suspense>` правилото към Route Handlers -> `<Suspense>` е задължително за `cookies()`/`headers()`/`searchParams` само при React рендериране (`page`/`layout`/RSC), докато `route.ts` и Server Actions ги `await`-ват директно *(избягва фалшиви архитектурни грешки)*.
- **[Segment Configs]** Не забравяй типови анотации и named exports при проверки за `dynamic`/`revalidate`/`fetchCache` -> блокирай `const`/`let`/`var` със или без `: Type` и `export { ... }` *(несъвместими с `cacheComponents: true`)*.

### Архитектура & Граници
- **[Feature Boundaries]** Не проверявай само `@/features/*` алиаси -> нормализирай и относителните (`./`, `../`) импорти спрямо файла, за да не се заобикалят `index.ts`/`server.ts` *(предпазва клиентския bundle и рефакторинга)*.
- **[File Size]** Не изключвай `.css` от лимита 300 реда -> прилагай го за `.ts`, `.tsx` и `.css` *(предотвратява монолитен `globals.css`)*.

### Multi-Agent & Worktrees
- **[Ownership Globs]** Не допускай припокриващи се пътища между агентите -> всяка зона трябва да е изцяло непресичаща се (`Testing` изключва `src/test/security/**`; `Backend` изключва `components/**` и `hooks/**` в `departments/**`) *(гарантира 0 merge конфликта)*.

### Frontend *(добавяй само повтаряеми уроци от Фаза 1+)*
- *(няма записани уроци все още)*

### Backend *(добавяй само повтаряеми уроци от Фаза 1+)*
- *(няма записани уроци все още)*

### Security & Testing *(добавяй само повтаряеми уроци от Фаза 1+)*
- *(няма записани уроци все още)*
