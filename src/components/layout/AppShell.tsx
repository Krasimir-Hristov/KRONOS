'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Clock,
  FileText,
  KeyRound,
  Lock,
  LogOut,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { lockPinAction, signOutAction } from '@/features/auth';

interface AppShellProps {
  readonly children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const appT = useTranslations('app');
  const [isPending, startTransition] = useTransition();

  const navItems = [
    { href: '/', label: t('chat'), icon: MessageSquare, exact: true },
    { href: '/documents', label: t('documents'), icon: FileText, exact: false },
    { href: '/vault', label: t('vault'), icon: KeyRound, exact: false },
  ] as const;

  const handleLockPin = () => {
    startTransition(async () => {
      await lockPinAction();
    });
  };

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-800/80 bg-slate-900/70 backdrop-blur-xl">
        <div className="p-6 border-b border-slate-800/80">
          <Link href="/" aria-label="KRONOS Начало" className="flex items-center gap-3 group">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-orange-600 text-slate-950 shadow-lg shadow-amber-500/20 transition-transform duration-200 group-hover:scale-105">
              <Clock className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <span className="block text-lg font-bold tracking-tight text-white">KRONOS</span>
              <span className="block text-xs text-slate-400">{appT('subtitle')}</span>
            </div>
          </Link>
        </div>

        <nav aria-label={t('mainMenu')} className="flex-1 px-4 py-6 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-linear-to-r from-amber-500/20 to-orange-500/10 text-amber-300 border border-amber-500/30'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-300">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{appT('pinProtected')}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={handleLockPin}
              aria-label={appT('lockPin')}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-950/80 border border-slate-800 py-2 px-3 text-xs font-semibold text-slate-300 hover:text-white hover:border-amber-500/40 transition-colors"
            >
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{appT('lockPin')}</span>
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleSignOut}
              aria-label={appT('signOut')}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-950/80 border border-slate-800 py-2 px-3 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:border-rose-500/40 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{appT('signOut')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl px-4 py-3">
        <Link href="/" aria-label="KRONOS Начало" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-amber-400 to-orange-600 text-slate-950">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-bold tracking-tight text-white">KRONOS</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={isPending}
            onClick={handleLockPin}
            aria-label={appT('lockPin')}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleSignOut}
            aria-label={appT('signOut')}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-rose-400 hover:text-rose-300"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-72 pb-24 lg:pb-10">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">{children}</div>
      </main>

      {/* Mobile 3-Icon Bottom Navigation */}
      <nav
        aria-label={t('mobileMenu')}
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-3 border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-xl px-2 py-2"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium transition-colors ${
                isActive ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
