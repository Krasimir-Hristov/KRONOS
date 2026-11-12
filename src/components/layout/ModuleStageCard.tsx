'use client';

import React from 'react';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type ModuleSectionKey = 'chat' | 'documents' | 'vault';

interface ModuleStageCardProps {
  readonly section: ModuleSectionKey;
}

export const ModuleStageCard: React.FC<ModuleStageCardProps> = ({ section }) => {
  const t = useTranslations(section);

  return (
    <section aria-label={t('title')} className="space-y-6">
      <article className="relative rounded-3xl border border-teal-950/80 bg-[#080e14]/85 p-6 sm:p-10 shadow-2xl backdrop-blur-2xl overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-500/40 bg-[#0b151d] p-1 shadow-md shadow-teal-500/20">
              <Image
                src="/kronos-logo.png"
                alt="KRONOS"
                width={32}
                height={32}
                className="rounded-lg object-cover"
              />
            </span>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-teal-300">
                {t('stageBadge')}
              </span>
              <span className="text-xs font-mono text-zinc-500">• {t('stageRole')}</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span>{t('title')}</span>
            <Sparkles className="h-5 w-5 text-teal-400 motion-safe:animate-pulse" />
          </h1>

          <p className="mt-3 max-w-2xl text-xs sm:text-sm text-zinc-400 leading-relaxed font-medium">
            {t('subtitle')}
          </p>
        </div>
      </article>
    </section>
  );
};
