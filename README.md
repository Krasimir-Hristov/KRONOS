# KRONOS (Κρόνος)

Личен & Семеен AI Асистент и Документен Сейф с нулев месечен разход за инфраструктура (0 €).

## Технологичен Стек

- **Framework**: Next.js 16 (App Router, React 19, TypeScript strict, Tailwind CSS v4)
- **Клиентско състояние**: TanStack Query v5
- **База данни & Вектори**: Supabase (PostgreSQL + pgvector + Full-Text Search + Auth)
- **Файлов Сторидж**: Cloudflare R2 (S3 Presigned URLs)
- **AI Архитектура**: OpenRouter API (`typesafe/jev` System One диспечер + LangGraph субагенти + традиционен Tool-Calling Supervisor бекъп)
- **Сигурност**: Next.js 16 `src/proxy.ts` с Allowlist Header Scrubbing (CVE-2025-29927 mitigation) + 15-мин Банков ПИН + Детски катинар (Kids Lock)
- **Качество**: Строг Phase Gate (`pnpm verify` = `verify:arch` + `typecheck` + `lint` + `test` + `build`)
