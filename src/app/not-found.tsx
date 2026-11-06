import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Страницата не е намерена',
  description: 'Търсената страница в KRONOS не съществува.',
};

const NotFoundPage: React.FC = () => (
  <main className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 text-zinc-100">
    <section
      aria-label="Страницата не е намерена"
      className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-center space-y-4"
    >
      <p className="font-mono text-4xl font-black text-cyan-400">404</p>
      <h1 className="text-xl font-bold">Страницата не е намерена</h1>
      <Link
        href="/"
        aria-label="Към началото"
        className="inline-block rounded-xl bg-linear-to-r from-cyan-500 via-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 transition-all"
      >
        Към началото
      </Link>
    </section>
  </main>
);

export default NotFoundPage;
