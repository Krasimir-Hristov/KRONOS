'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileCode2,
  KeySquare,
  MessageSquare,
  MessageSquareCode,
  MessageSquarePlus,
  Sparkles,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { KRONOS_SESSION_EVENT } from './KronosChatShowcase';
import {
  MOCK_CHAT_SESSIONS,
  SIDEBAR_PLACEHOLDER_LINKS,
} from './kronosChatMockData';

interface SidebarNavSectionsProps {
  readonly pathname: string;
}

export const SidebarNavSections: React.FC<SidebarNavSectionsProps> = ({
  pathname,
}) => {
  const t = useTranslations('nav');
  const router = useRouter();

  const navItems = [
    { href: '/', label: t('chat'), icon: MessageSquareCode, exact: true, badge: 'AI UI' },
    {
      href: '/documents',
      label: t('documents'),
      icon: FileCode2,
      exact: false,
      badge: 'МОК',
    },
    { href: '/vault', label: t('vault'), icon: KeySquare, exact: false, badge: 'МОК' },
  ] as const;

  const handleSelectChatSession = (sessionId: string) => {
    if (pathname !== '/') {
      router.push('/');
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent<string>(KRONOS_SESSION_EVENT, { detail: sessionId })
        );
      }, 120);
      return;
    }
    window.dispatchEvent(
      new CustomEvent<string>(KRONOS_SESSION_EVENT, { detail: sessionId })
    );
  };

  return (
    <nav aria-label={t('mainMenu')} className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5">
      {/* + New Chat Button Inside Sidebar */}
      <button
        type="button"
        onClick={() => handleSelectChatSession('new')}
        aria-label="Започни нов разговор"
        className="cursor-pointer flex w-full items-center justify-center gap-2 rounded-xl border border-teal-500/45 bg-linear-to-r from-teal-500/20 via-teal-500/15 to-emerald-500/20 px-3.5 py-2.5 text-xs font-bold text-teal-100 shadow-md shadow-teal-500/10 transition-all hover:border-teal-400 hover:from-teal-500/30 hover:to-emerald-500/30"
      >
        <MessageSquarePlus className="h-4 w-4 text-teal-300" aria-hidden="true" />
        <span>+ Нов разговор</span>
      </button>

      {/* Active Mock-Data Workspace Links */}
      <div className="space-y-1.5">
        <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-teal-400/80">
          Основни Модули (UI Преглед)
        </span>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-linear-to-r from-teal-500/20 via-teal-500/10 to-transparent text-teal-200 border border-teal-500/40 shadow-inner shadow-teal-500/10'
                  : 'text-zinc-400 hover:bg-[#0d1720] hover:text-zinc-100 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? 'text-teal-400' : 'text-zinc-500 group-hover:text-teal-300'
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </div>
              <span className="rounded bg-teal-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-teal-300 shrink-0">
                {item.badge}
              </span>
            </Link>
          );
        })}
      </div>

      {/* ChatGPT / Gemini Recent Chat Sessions */}
      <div className="space-y-1.5">
        <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Последни разговори
        </span>
        {MOCK_CHAT_SESSIONS.map((session) => (
          <button
            key={session.id}
            type="button"
            onClick={() => handleSelectChatSession(session.id)}
            aria-label={session.title}
            className="cursor-pointer group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs text-zinc-300 hover:bg-[#0d1720] hover:text-teal-200 transition-colors"
          >
            <MessageSquare
              className="h-3.5 w-3.5 shrink-0 text-teal-500/70"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <span className="block truncate font-medium">{session.title}</span>
              <span className="block text-[10px] text-zinc-500">
                {session.updatedAtLabel}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Inactive Placeholder Sidebar Links for Visual Inspection */}
      <div className="space-y-1.5">
        <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          AI Субагенти (Неактивни)
        </span>
        {SIDEBAR_PLACEHOLDER_LINKS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={(e) => e.preventDefault()}
            title={item.hint}
            aria-label={`${item.label} (${item.hint})`}
            className="cursor-pointer flex w-full items-center justify-between rounded-xl border border-dashed border-zinc-800/80 bg-[#070c11]/70 px-3 py-2 text-left text-[11px] text-zinc-500 transition-colors hover:border-teal-500/30 hover:text-zinc-300"
          >
            <span className="flex items-center gap-2 truncate">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-teal-500/50" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="rounded bg-zinc-800/90 px-1.5 py-0.5 font-mono text-[9px] text-zinc-400">
              {item.badge}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};
