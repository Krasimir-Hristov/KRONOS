'use client';

import React, { useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileCode2,
  KeySquare,
  Lock,
  LogOut,
  MessageSquareCode,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { SidebarProvider, useSidebar } from './SidebarContext';
import { SidebarNavSections } from './SidebarNavSections';

interface AppShellProps {
  readonly children: React.ReactNode;
}

const AppShellContent: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const t = useTranslations('nav');
  const appT = useTranslations('app');
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = React.useState<string | null>(null);

  const { isSidebarOpen, setIsSidebarOpen, sidebarWidthPx, setSidebarWidthPx } =
    useSidebar();

  const mobileNavItems = [
    { href: '/', label: t('chat'), icon: MessageSquareCode, exact: true },
    { href: '/documents', label: t('documents'), icon: FileCode2, exact: false },
    { href: '/vault', label: t('vault'), icon: KeySquare, exact: false },
  ] as const;

  const handleStartSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidthPx;

    const onMouseMove = (moveEv: MouseEvent) => {
      const next = startWidth + (moveEv.clientX - startX);
      if (next < 140) {
        setIsSidebarOpen(false);
        return;
      }
      setIsSidebarOpen(true);
      setSidebarWidthPx(Math.min(440, Math.max(220, next)));
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleLockPin = () => {
    setActionError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/lock', { method: 'POST' });
        if (res.ok) {
          window.location.replace('/pin');
          return;
        }
        setActionError(t('lockError'));
      } catch {
        setActionError(t('lockError'));
      }
    });
  };

  const handleSignOut = () => {
    setActionError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/logout', { method: 'POST' });
        if (res.ok) {
          queryClient.clear();
          window.location.replace('/login');
          return;
        }
        setActionError(t('signOutError'));
      } catch {
        setActionError(t('signOutError'));
      }
    });
  };

  const isChatHome = pathname === '/';

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#060a0e] text-zinc-100 flex flex-col lg:flex-row font-sans selection:bg-teal-500/30 selection:text-teal-200">
      {/* Resizable Desktop Sidebar */}
      {isSidebarOpen && (
        <aside
          style={{ width: `${sidebarWidthPx}px` }}
          className="hidden lg:flex lg:flex-col h-full shrink-0 border-r border-teal-950/80 bg-[#080e14]/95 backdrop-blur-2xl relative z-40 select-none"
        >
          <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-3.5 border-b border-teal-950/80 bg-[#080e14]/95">
            <Link href="/" aria-label="KRONOS Начало" className="flex items-center gap-3 min-w-0">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-teal-500/40 bg-[#0b151d] p-1 shadow-md shadow-teal-500/20">
                <Image src="/kronos-logo.png" alt="KRONOS Logo" width={30} height={30} className="rounded-xl object-cover" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="animate-kronos-glint text-base font-black tracking-widest uppercase">KRONOS</span>
                  <span className="rounded border border-teal-500/35 bg-teal-500/10 px-1.5 py-0.5 text-[9px] font-mono font-bold text-teal-300">NEURAL</span>
                </div>
                <span className="block truncate text-[10px] font-medium text-zinc-400">{appT('subtitle')}</span>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              aria-label={t('closeSidebar')}
              title={t('closeSidebar')}
              className="cursor-pointer flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-[#0b141c] text-zinc-400 hover:border-teal-500/40 hover:text-teal-300"
            >
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <SidebarNavSections pathname={pathname} />

          <div className="p-3 border-t border-teal-950/70 space-y-2">
            <div className="flex items-center justify-between gap-2 rounded-xl bg-[#0b141c] border border-teal-950/90 px-3 py-1.5 text-[11px]">
              <div className="flex items-center gap-2 text-teal-300 font-mono min-w-0">
                <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse shrink-0" />
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal-400" aria-hidden="true" />
                <span className="truncate">{appT('pinProtected')}</span>
              </div>
              <span className="font-mono text-[10px] text-teal-500/80 shrink-0">AES-256</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={handleLockPin}
                aria-label={appT('lockPin')}
                className="cursor-pointer flex items-center justify-center gap-1.5 rounded-xl bg-[#0c151e] border border-zinc-800 py-1.5 px-2 text-xs font-semibold text-zinc-300 hover:text-white hover:border-teal-500/40 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Lock className="h-3.5 w-3.5 text-teal-400" aria-hidden="true" />
                <span className="truncate">{appT('lockPin')}</span>
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSignOut}
                aria-label={appT('signOut')}
                className="cursor-pointer flex items-center justify-center gap-1.5 rounded-xl bg-[#0c151e] border border-zinc-800 py-1.5 px-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:border-rose-500/40 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="truncate">{appT('signOut')}</span>
              </button>
            </div>
            {actionError && (
              <p role="alert" className="text-[11px] font-medium text-rose-400 text-center">
                {actionError}
              </p>
            )}
          </div>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Плъзни с мишката за промяна на ширината на менюто"
            onMouseDown={handleStartSidebarResize}
            className="group absolute inset-y-0 -right-1 z-50 w-2 cursor-col-resize flex items-center justify-center select-none"
          >
            <span className="h-16 w-1 rounded-full bg-teal-500/20 transition-colors group-hover:bg-teal-400" />
          </div>
        </aside>
      )}

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-teal-950/80 bg-[#080e14]/90 backdrop-blur-2xl px-4 py-2.5">
        <Link href="/" aria-label="KRONOS Начало" className="flex items-center gap-2.5">
          <Image src="/kronos-logo.png" alt="KRONOS Logo" width={32} height={32} className="rounded-xl border border-teal-500/40" />
          <span className="font-black tracking-widest text-white text-base">KRONOS</span>
        </Link>
        <div className="flex items-center gap-2">
          <button type="button" disabled={isPending} onClick={handleLockPin} aria-label={appT('lockPin')} className="cursor-pointer p-2 rounded-xl bg-[#0c151e] border border-zinc-800 text-teal-400">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" disabled={isPending} onClick={handleSignOut} aria-label={appT('signOut')} className="cursor-pointer p-2 rounded-xl bg-[#0c151e] border border-zinc-800 text-rose-400">
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Mobile Action Error Alert */}
      {actionError && (
        <div className="lg:hidden bg-rose-950/80 border-b border-rose-500/40 px-4 py-1.5 text-center">
          <p role="alert" className="text-xs font-medium text-rose-300">
            {actionError}
          </p>
        </div>
      )}

      {/* Main App Canvas */}
      <main className="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
        {!isSidebarOpen && !isChatHome && (
          <div className="hidden lg:flex items-center border-b border-teal-950/70 bg-[#080e14]/90 px-4 py-2">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label={t('openSidebar')}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-[#09131b] px-2.5 py-1 text-xs font-bold text-teal-200 hover:border-teal-400 hover:bg-[#0d1d2b]"
            >
              <PanelLeftOpen className="h-4 w-4 text-teal-400" aria-hidden="true" />
              <span>{t('openSidebar')}</span>
            </button>
          </div>
        )}
        {isChatHome ? (
          children
        ) : (
          <div className="flex-1 overflow-y-auto p-4 pb-24 sm:p-8 lg:pb-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label={t('mobileMenu')}
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-3 border-t border-teal-950/80 bg-[#080e14]/95 backdrop-blur-2xl px-2 py-2"
      >
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} aria-label={item.label} className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition-colors ${isActive ? 'text-teal-300 bg-teal-500/15' : 'text-zinc-400 hover:text-zinc-200'}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <SidebarProvider>
      <AppShellContent>{children}</AppShellContent>
    </SidebarProvider>
  );
};
