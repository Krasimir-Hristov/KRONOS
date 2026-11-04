'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Cpu, Lock, Mail, ShieldAlert, Sparkles } from 'lucide-react';
import { signInAction } from '../dal/authActions';

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const result = await signInAction({ email, password });
        if (!result.ok) {
          setErrorMessage(result.errorMessage);
          return;
        }
        router.push('/pin');
        router.refresh();
      } catch {
        setErrorMessage('Проблем с мрежовата връзка. Моля, опитайте отново.');
      }
    });
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 sm:p-0">
      <div className="relative rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-8 shadow-2xl backdrop-blur-2xl overflow-hidden">
        {/* Subtle background tech glow */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="flex flex-col items-center text-center mb-8 relative">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-tr from-cyan-500 via-indigo-600 to-violet-600 text-white shadow-xl shadow-cyan-500/20 mb-4">
            <Cpu className="h-8 w-8" aria-hidden="true" />
            <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-cyan-300 animate-pulse" />
          </div>

          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black tracking-wider text-white uppercase">
              KRONOS
            </h1>
            <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-cyan-400">
              SECURE
            </span>
          </div>

          <p className="text-xs font-medium text-zinc-400 max-w-xs">
            Личен AI Асистент & Документен RAG Сейф
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 p-3.5 text-xs font-medium text-rose-300 animate-shake"
          >
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative">
          <div>
            <label
              htmlFor="email-input"
              className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2"
            >
              Имейл Адрес
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Mail className="h-4 w-4" aria-hidden="true" />
              </span>
              <input
                id="email-input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                aria-label="Имейл адрес за вход"
                className="w-full rounded-xl bg-zinc-900/90 border border-zinc-800 pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/80 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password-input"
              className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2"
            >
              Парола
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Lock className="h-4 w-4" aria-hidden="true" />
              </span>
              <input
                id="password-input"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                aria-label="Парола за вход"
                className="w-full rounded-xl bg-zinc-900/90 border border-zinc-800 pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/80 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            aria-label="Влез в KRONOS"
            className="w-full mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-500 via-indigo-600 to-violet-600 py-3.5 px-4 text-xs font-bold tracking-wider uppercase text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            <span>{isPending ? 'Автентикация...' : 'Влез в Системата'}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
};
