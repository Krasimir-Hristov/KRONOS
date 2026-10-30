'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, MessageSquare, Sparkles, Users, Wallet } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

export const OverviewDashboard: React.FC = () => {
  const { dictionary } = useLanguage();

  const pillars = [
    {
      href: '/documents',
      title: dictionary.sections.documentsTitle,
      description: dictionary.sections.documentsDescription,
      icon: FileText,
      accent: 'from-sky-500/20 to-indigo-500/5 border-sky-500/30',
    },
    {
      href: '/chat',
      title: dictionary.sections.chatTitle,
      description: dictionary.sections.chatDescription,
      icon: MessageSquare,
      accent: 'from-amber-500/20 to-orange-500/5 border-amber-500/30',
    },
    {
      href: '/family',
      title: dictionary.sections.familyTitle,
      description: dictionary.sections.familyDescription,
      icon: Users,
      accent: 'from-emerald-500/20 to-teal-500/5 border-emerald-500/30',
    },
    {
      href: '/finance',
      title: dictionary.sections.financeTitle,
      description: dictionary.sections.financeDescription,
      icon: Wallet,
      accent: 'from-purple-500/20 to-pink-500/5 border-purple-500/30',
    },
  ] as const;

  return (
    <section aria-label={dictionary.sections.overviewHeading} className="space-y-8">
      <header className="rounded-3xl border border-slate-800 bg-linear-to-br from-slate-900 via-slate-900 to-amber-950/30 p-6 sm:p-10 shadow-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/30 px-3.5 py-1 text-xs font-semibold text-amber-300 mb-4">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{dictionary.sections.phaseReadyBadge}</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
          {dictionary.sections.overviewHeading}
        </h1>
        <p className="mt-3 max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed">
          {dictionary.sections.overviewDescription}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <article
              key={pillar.href}
              className={`group rounded-2xl border bg-linear-to-br ${pillar.accent} p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950/70 border border-slate-800 text-white">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <Link
                  href={pillar.href}
                  aria-label={`${dictionary.sections.openModuleLabel}: ${pillar.title}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-slate-800 transition-colors group-hover:border-amber-400/50 group-hover:text-amber-300"
                >
                  <span>{dictionary.sections.openModuleLabel}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>

              <h2 className="mt-5 text-lg font-semibold text-white">{pillar.title}</h2>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                {pillar.description}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
};
