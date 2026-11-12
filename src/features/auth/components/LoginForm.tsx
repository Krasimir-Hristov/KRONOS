'use client';

import React, { useState } from 'react';
import { ArrowRight, Cpu, Lock, Mail, ShieldAlert, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { authApiResponseSchema } from '../schemas/authSchema';

export const LoginForm: React.FC = () => {
  const t = useTranslations('auth');
  const appT = useTranslations('app');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const rawJson: unknown = await res.json().catch(() => null);
      const parsed = authApiResponseSchema.safeParse(rawJson);

      if (!res.ok || !parsed.success || !parsed.data.ok) {
        const errorMsg = parsed.success ? parsed.data.errorMessage : null;
        setErrorMessage(errorMsg ?? t('invalidCredentials'));
        setIsSubmitting(false);
        return;
      }

      window.location.replace('/pin');
    } catch {
      setErrorMessage(t('networkError'));
      setIsSubmitting(false);
    }
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
            <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-cyan-300 animate-pulse motion-reduce:animate-none" />
          </div>

          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black tracking-wider text-white uppercase">
              {appT('title')}
            </h1>
            <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-cyan-400">
              SECURE
            </span>
          </div>

          <p className="text-xs font-medium text-zinc-400 max-w-xs">
            {appT('subtitle')}
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
              {t('emailLabel')}
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
                aria-label={t('emailLabel')}
                className="w-full rounded-xl bg-zinc-900/90 border border-zinc-800 pl-10 pr-4 py-3 text-base md:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/80 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password-input"
              className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2"
            >
              {t('passwordLabel')}
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
                aria-label={t('passwordLabel')}
                className="w-full rounded-xl bg-zinc-900/90 border border-zinc-800 pl-10 pr-4 py-3 text-base md:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/80 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            aria-label={isSubmitting ? t('loggingIn') : t('loginButton')}
            className="w-full mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-500 via-indigo-600 to-violet-600 py-3.5 px-4 text-xs font-bold tracking-wider uppercase text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            <span>{isSubmitting ? t('loggingIn') : t('loginButton')}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
};
