'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

interface ErrorPageProps {
  readonly error: Error & { digest?: string };
  readonly retry: () => void;
}

const ErrorPage: React.FC<ErrorPageProps> = ({ retry }) => {
  const t = useTranslations('errorPage');

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 text-zinc-100">
      <section
        role="alert"
        aria-label={t('ariaLabel')}
        className="w-full max-w-md rounded-3xl border border-rose-500/30 bg-rose-950/20 p-8 text-center space-y-4"
      >
        <h1 className="text-xl font-bold text-rose-300">{t('title')}</h1>
        <p className="text-sm text-zinc-400">{t('description')}</p>
        <button
          type="button"
          onClick={() => retry()}
          aria-label={t('retryButton')}
          className="rounded-xl bg-linear-to-r from-cyan-500 via-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 active:scale-95 transition-all"
        >
          {t('retryButton')}
        </button>
      </section>
    </main>
  );
};

export default ErrorPage;
