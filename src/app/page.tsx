import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KRONOS — Инициализация',
  description: 'Работна основа на KRONOS v2 (Фаза 0).',
};

const HomePage = () => {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-linear-to-b from-[#060a0e] via-[#091219] to-[#060a0e] px-6 py-16 text-center">
      <section className="max-w-xl rounded-2xl border border-teal-500/20 bg-slate-950/70 p-8 shadow-2xl backdrop-blur-md">
        <p className="text-xs font-mono uppercase tracking-[0.25em] text-teal-400">
          KRONOS v2 · Phase 0
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50">
          Инженерната основа е активна
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          Next.js 16.4, TypeScript, Tailwind CSS v4, LangGraph и Supabase са подготвени за Фаза 1.
        </p>
      </section>
    </main>
  );
};

export default HomePage;
