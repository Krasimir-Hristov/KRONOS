'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

export type ModuleSectionKey = 'chat' | 'documents' | 'vault';

interface ModuleStageCardProps {
  readonly section: ModuleSectionKey;
}

export const ModuleStageCard: React.FC<ModuleStageCardProps> = ({ section }) => {
  const t = useTranslations(section);
  const appT = useTranslations('app');

  return (
    <section aria-label={t('title')} className="space-y-6">
      <article className="rounded-3xl border border-slate-800 bg-linear-to-br from-slate-900 to-slate-950 p-6 sm:p-10 shadow-xl">
        <span className="inline-block rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1 text-xs font-semibold text-emerald-300 mb-4">
          {appT('pinProtected')}
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">{t('title')}</h1>
        <p className="mt-3 max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed">
          {t('subtitle')}
        </p>
      </article>
    </section>
  );
};
