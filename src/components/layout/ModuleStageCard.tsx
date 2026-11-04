'use client';

import React from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type ModuleSectionKey = 'chat' | 'documents' | 'vault';

interface ModuleStageCardProps {
  readonly section: ModuleSectionKey;
}

export const ModuleStageCard: React.FC<ModuleStageCardProps> = ({ section }) => {
  const t = useTranslations(section);

  return (
    <section aria-label={t('title')} className="space-y-6">
      <article className="relative rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-6 sm:p-10 shadow-2xl backdrop-blur-2xl overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-tr from-cyan-500 via-indigo-600 to-violet-600 text-white shadow-md shadow-cyan-500/20">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-400">
                PHASE 3 ACTIVE
              </span>
              <span className="text-xs font-mono text-zinc-500">• SUPERVISOR</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span>{t('title')}</span>
            <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" />
          </h1>

          <p className="mt-3 max-w-2xl text-xs sm:text-sm text-zinc-400 leading-relaxed font-medium">
            {t('subtitle')}
          </p>
        </div>
      </article>
    </section>
  );
};
