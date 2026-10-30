'use client';

import React from 'react';
import { useLanguage } from '@/i18n/LanguageContext';

export type ModuleSectionKey = 'chat' | 'documents' | 'finance' | 'family';

interface ModuleStageCardProps {
  readonly section: ModuleSectionKey;
}

export const ModuleStageCard: React.FC<ModuleStageCardProps> = ({ section }) => {
  const { dictionary } = useLanguage();

  const contentMap: Record<
    ModuleSectionKey,
    { readonly title: string; readonly description: string }
  > = {
    chat: {
      title: dictionary.sections.chatTitle,
      description: dictionary.sections.chatDescription,
    },
    documents: {
      title: dictionary.sections.documentsTitle,
      description: dictionary.sections.documentsDescription,
    },
    finance: {
      title: dictionary.sections.financeTitle,
      description: dictionary.sections.financeDescription,
    },
    family: {
      title: dictionary.sections.familyTitle,
      description: dictionary.sections.familyDescription,
    },
  };

  const current = contentMap[section];

  return (
    <section aria-label={current.title} className="space-y-6">
      <article className="rounded-3xl border border-slate-800 bg-linear-to-br from-slate-900 to-slate-950 p-6 sm:p-10 shadow-xl">
        <span className="inline-block rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-300 mb-4">
          {dictionary.sections.phaseReadyBadge}
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">{current.title}</h1>
        <p className="mt-3 max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed">
          {current.description}
        </p>
      </article>
    </section>
  );
};
