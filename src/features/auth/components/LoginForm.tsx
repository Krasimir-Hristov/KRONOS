'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Lock, Mail, ShieldAlert } from 'lucide-react';
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
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-3xl border border-slate-800 bg-linear-to-b from-slate-900 via-slate-900 to-slate-950 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-amber-400 to-orange-600 text-slate-950 shadow-xl shadow-amber-500/20 mb-4">
            <Clock className="h-9 w-9" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Вход в KRONOS</h1>
          <p className="mt-2 text-sm text-slate-400">
            Личен AI Асистент & Документен RAG Сейф
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-3 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-300"
          >
            <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email-input"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
            >
              Имейл Адрес
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
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
                className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/80 transition-colors"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password-input"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
            >
              Парола
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
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
                className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/80 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            aria-label="Влез в KRONOS"
            className="w-full mt-2 rounded-xl bg-linear-to-r from-amber-400 to-orange-500 py-3.5 px-4 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all"
          >
            {isPending ? 'Проверка...' : 'Влез в KRONOS'}
          </button>
        </form>
      </div>
    </div>
  );
};
