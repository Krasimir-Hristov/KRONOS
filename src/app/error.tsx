'use client';

import React from 'react';

interface ErrorPageProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

const ErrorPage: React.FC<ErrorPageProps> = ({ reset }) => (
  <main className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 text-zinc-100">
    <section
      role="alert"
      aria-label="Възникна грешка"
      className="w-full max-w-md rounded-3xl border border-rose-500/30 bg-rose-950/20 p-8 text-center space-y-4"
    >
      <h1 className="text-xl font-bold text-rose-300">Нещо се обърка</h1>
      <p className="text-sm text-zinc-400">
        Възникна неочаквана грешка. Данните ви са в безопасност. Опитайте отново.
      </p>
      <button
        type="button"
        onClick={reset}
        aria-label="Опитай отново"
        className="rounded-xl bg-linear-to-r from-cyan-500 via-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 active:scale-95 transition-all"
      >
        Опитай отново
      </button>
    </section>
  </main>
);

export default ErrorPage;
