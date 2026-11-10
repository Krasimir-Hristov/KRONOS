import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileCode2,
  KeySquare,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { requireAuthAndPin } from '@/features/auth/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'KRONOS — Главен Център',
  description:
    'Главен тестов център на KRONOS: Аутентикация, 4-цифрен ПИН код, Документен Сейф и Данни & Пароли.',
};

const WorkspaceHomePage: React.FC = async () => {
  const auth = await requireAuthAndPin();

  return (
    <main
      aria-label="Главен Център на KRONOS"
      className="flex-1 min-h-screen px-4 sm:px-8 lg:px-12 py-8 sm:py-12 bg-zinc-950 text-zinc-100"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>KRONOS Системен Статус</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Главен Контролен Център
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
            Аутентикацията и защитата с 4-цифрен ПИН код функционират нормално.
            Системата е изчистена и готова за новото поетапно изграждане.
          </p>
        </header>

        {/* Status Badges */}
        <section aria-label="Статус на сигурността и базата данни">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4.5 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xs font-semibold text-zinc-300">Supabase Auth</h2>
                  <p className="text-[11px] font-mono text-emerald-400 font-medium">
                    Активна сесия
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4.5 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
                  <Lock className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xs font-semibold text-zinc-300">4-Цифрен ПИН</h2>
                  <p className="text-[11px] font-mono text-cyan-400 font-medium">
                    Отключен (15 мин TTL)
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4.5 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
                  <Database className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xs font-semibold text-zinc-300">PostgreSQL + Storage</h2>
                  <p className="text-[11px] font-mono text-violet-400 font-medium">
                    Свързани (Непокътнати)
                  </p>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* Modules Navigation Cards */}
        <section aria-label="Активни модули" className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Налични Модули за Тестване
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/documents"
              aria-label="Отвори Документен Сейф"
              className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/90 hover:border-cyan-500/40 p-5 transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                    <FileCode2 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                      Документен Сейф
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Масово качване, OCR обработка и търсене
                    </p>
                  </div>
                </div>
                <ArrowRight
                  className="h-4 w-4 text-zinc-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all"
                  aria-hidden="true"
                />
              </div>
            </Link>

            <Link
              href="/vault"
              aria-label="Отвори Данни и Пароли"
              className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/90 hover:border-violet-500/40 p-5 transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20 transition-colors">
                    <KeySquare className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors">
                      Данни & Пароли
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Лични факти и криптирани пароли
                    </p>
                  </div>
                </div>
                <ArrowRight
                  className="h-4 w-4 text-zinc-500 group-hover:text-violet-400 group-hover:translate-x-1 transition-all"
                  aria-hidden="true"
                />
              </div>
            </Link>
          </div>
        </section>

        {/* Clean Slate Notice */}
        <section
          aria-label="Информация за изчистването на кода"
          className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-5 text-xs text-zinc-400 space-y-2 leading-relaxed"
        >
          <div className="flex items-center gap-2 text-zinc-300 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span>Чиста основа (Clean Slate)</span>
          </div>
          <p>
            Всички предишни субагенти, комплексни рутери и ботове са успешно изтрити
            от проекта. Базата данни, таблиците, миграциите и файловете в Supabase
            Storage остават непокътнати.
          </p>
          <p className="text-[11px] font-mono text-zinc-500">
            Идентификатор на потребителя: {auth.userId}
          </p>
        </section>
      </div>
    </main>
  );
};

export default WorkspaceHomePage;
