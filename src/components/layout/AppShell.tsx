'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Cpu,
  FileCode2,
  KeySquare,
  Lock,
  LogOut,
  MessageSquareCode,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

interface AppShellProps {
  readonly children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const t = useTranslations('nav');
  const appT = useTranslations('app');
  const [isPending, startTransition] = useTransition();

  const navItems = [
    { href: '/', label: t('chat'), icon: MessageSquareCode, exact: true },
    { href: '/documents', label: t('documents'), icon: FileCode2, exact: false },
    { href: '/vault', label: t('vault'), icon: KeySquare, exact: false },
  ] as const;

  const handleLockPin = () => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/lock', { method: 'POST' });
        if (res.ok) {
          window.location.replace('/pin');
        }
      } catch {
        // Network error; retain screen
      }
    });
  };

  const handleSignOut = () => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/logout', { method: 'POST' });
        if (res.ok) {
          queryClient.clear();
          window.location.replace('/login');
        }
      } catch {
        // Network error; retain screen
      }
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col lg:flex-row font-sans selection:bg-cyan-500/25 selection:text-cyan-200">
      {/* Desktop Tech Sidebar */}
      <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 border-r border-zinc-800/80 bg-zinc-950/80 backdrop-blur-2xl z-40">
        <div className="p-6 border-b border-zinc-800/70">
          <Link href="/" aria-label="KRONOS Начало" className="flex items-center gap-3.5 group">
            <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-tr from-cyan-500 via-indigo-600 to-violet-600 text-white shadow-lg shadow-cyan-500/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-cyan-500/35">
              <Sparkles className="h-5 w-5 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
              <span className="absolute -inset-0.5 rounded-2xl bg-linear-to-tr from-cyan-500 to-violet-600 opacity-0 blur group-hover:opacity-40 transition-opacity" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-widest text-white uppercase bg-linear-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                  KRONOS
                </span>
                <span className="inline-flex items-center rounded-md border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider text-cyan-400">
                  AI v2
                </span>
              </div>
              <span className="block text-[11px] font-medium text-zinc-400">
                {appT('subtitle')}
              </span>
            </div>
          </Link>
        </div>

        <nav aria-label={t('mainMenu')} className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={`group flex items-center justify-between rounded-xl px-4 py-3 text-xs font-semibold tracking-wide transition-all duration-200 ${
                  isActive
                    ? 'bg-linear-to-r from-cyan-500/15 via-indigo-500/10 to-transparent text-cyan-300 border border-cyan-500/30 shadow-inner shadow-cyan-500/5'
                    : 'text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-100 hover:border-zinc-800 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover:text-zinc-300'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </div>
                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800/70 space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-zinc-900/90 border border-zinc-800/80 px-3.5 py-2.5 text-[11px]">
            <div className="flex items-center gap-2 text-emerald-400 font-mono min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{appT('pinProtected')}</span>
            </div>
            <span className="font-mono text-[10px] text-zinc-500 shrink-0">AES-256</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={handleLockPin}
              aria-label={appT('lockPin')}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 px-3 text-xs font-semibold text-zinc-300 hover:text-white hover:border-cyan-500/40 hover:bg-zinc-850 active:scale-95 transition-all"
            >
              <Lock className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
              <span>{appT('lockPin')}</span>
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleSignOut}
              aria-label={appT('signOut')}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 px-3 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:border-rose-500/40 hover:bg-zinc-850 active:scale-95 transition-all"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{appT('signOut')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Tech Header */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/85 backdrop-blur-2xl px-4 py-3">
        <Link href="/" aria-label="KRONOS Начало" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-tr from-cyan-500 via-indigo-600 to-violet-600 text-white shadow-md shadow-cyan-500/20">
            <Cpu className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-black tracking-widest text-white text-base">KRONOS</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleLockPin}
            aria-label={appT('lockPin')}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-cyan-400"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleSignOut}
            aria-label={appT('signOut')}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-rose-400 hover:text-rose-300"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-72 pb-24 lg:pb-10">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </main>

      {/* Mobile Cyber Bottom Navigation */}
      <nav
        aria-label={t('mobileMenu')}
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-3 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur-2xl px-2 py-2"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition-colors ${
                isActive ? 'text-cyan-400 bg-cyan-500/10' : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
