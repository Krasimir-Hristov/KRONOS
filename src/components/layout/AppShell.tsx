'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Clock,
  FileText,
  Home,
  MessageSquare,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface AppShellProps {
  readonly children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const { locale, dictionary, setLocale } = useLanguage();

  const navItems = [
    { href: '/chat', label: dictionary.nav.chat, icon: MessageSquare },
    { href: '/documents', label: dictionary.nav.documents, icon: FileText },
    { href: '/finance', label: dictionary.nav.finance, icon: Wallet },
    { href: '/family', label: dictionary.nav.family, icon: Users },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-800/80 bg-slate-900/70 backdrop-blur-xl">
        <div className="p-6 border-b border-slate-800/80">
          <Link
            href="/"
            aria-label={dictionary.nav.overview}
            className="flex items-center gap-3 group"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-orange-600 text-slate-950 shadow-lg shadow-amber-500/20 transition-transform duration-200 group-hover:scale-105">
              <Clock className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <span className="block text-lg font-bold tracking-tight text-white">
                KRONOS
              </span>
              <span className="block text-xs text-slate-400">
                {dictionary.app.subtitle}
              </span>
            </div>
          </Link>
        </div>

        <nav
          aria-label={dictionary.nav.mainAriaLabel}
          className="flex-1 px-4 py-6 space-y-1.5"
        >
          <Link
            href="/"
            aria-label={dictionary.nav.overview}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-150 ${
              pathname === '/'
                ? 'bg-linear-to-r from-amber-500/20 to-orange-500/10 text-amber-300 border border-amber-500/30'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Home className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{dictionary.nav.overview}</span>
          </Link>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
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
            <span>{dictionary.app.pinProtectedBadge}</span>
          </div>

          <div
            role="group"
            aria-label={dictionary.app.languageLabel}
            className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-950/80 p-1 border border-slate-800"
          >
            <button
              type="button"
              aria-label="Български език"
              onClick={() => setLocale('bg')}
              className={`rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                locale === 'bg'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇧🇬 BG
            </button>
            <button
              type="button"
              aria-label="Ελληνική γλώσσα"
              onClick={() => setLocale('el')}
              className={`rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                locale === 'el'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇬🇷 EL
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl px-4 py-3">
        <Link href="/" aria-label={dictionary.nav.overview} className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-amber-400 to-orange-600 text-slate-950">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-bold tracking-tight text-white">KRONOS</span>
        </Link>

        <div
          role="group"
          aria-label={dictionary.app.languageLabel}
          className="flex items-center gap-1 rounded-lg bg-slate-900 p-1 border border-slate-800"
        >
          <button
            type="button"
            aria-label="Български език"
            onClick={() => setLocale('bg')}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
              locale === 'bg' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
            }`}
          >
            🇧🇬 BG
          </button>
          <button
            type="button"
            aria-label="Ελληνική γλώσσα"
            onClick={() => setLocale('el')}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
              locale === 'el' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
            }`}
          >
            🇬🇷 EL
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-72 pb-24 lg:pb-10">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">{children}</div>
      </main>

      {/* Mobile 4-Icon Bottom Navigation */}
      <nav
        aria-label={dictionary.nav.mobileAriaLabel}
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-4 border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-xl px-2 py-2"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
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
