'use client';

import React from 'react';
import { MessageSquarePlus, MessagesSquare, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChatSessionSummary } from '../schemas/assistantSchema';

interface AssistantSidebarProps {
  readonly sessions: readonly ChatSessionSummary[];
  readonly activeSessionId: string | null;
  readonly isBusy: boolean;
  readonly onSelectSession: (sessionId: string) => void;
  readonly onCreateSession: () => void;
  readonly onDeleteSession: (sessionId: string, title: string) => void;
}

export const AssistantSidebar: React.FC<AssistantSidebarProps> = ({
  sessions,
  activeSessionId,
  isBusy,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
}) => {
  const t = useTranslations('chat');

  return (
    <aside
      aria-label={t('sessionsTitle')}
      className="w-full xl:w-64 shrink-0 rounded-3xl border border-zinc-800/80 bg-zinc-950/75 p-4 shadow-xl backdrop-blur-2xl flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300 uppercase">
          <MessagesSquare className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          <span>{t('sessionsTitle')}</span>
        </div>

        <button
          type="button"
          disabled={isBusy}
          onClick={onCreateSession}
          aria-label={t('newSession')}
          className="inline-flex items-center gap-1 rounded-xl border border-cyan-500/35 bg-cyan-500/15 px-2.5 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500 hover:text-zinc-950 disabled:opacity-40 transition-all"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t('newSession')}</span>
        </button>
      </div>

      {sessions.length === 0 ? (
        <p className="py-4 text-center text-xs text-zinc-500">{t('emptySessions')}</p>
      ) : (
        <nav aria-label="История на разговорите" className="space-y-1.5 max-h-56 xl:max-h-[60vh] overflow-y-auto pr-0.5">
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                className={`group flex items-center justify-between gap-1.5 rounded-xl border px-3 py-2 transition-all ${
                  isActive
                    ? 'border-cyan-500/35 bg-cyan-500/10 text-cyan-200'
                    : 'border-transparent bg-zinc-900/50 text-zinc-400 hover:border-zinc-800 hover:text-zinc-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectSession(session.id)}
                  aria-label={`Отвори разговор ${session.title}`}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-xs font-semibold truncate">{session.title}</p>
                  <span className="block text-[10px] font-mono text-zinc-500">
                    {session.updatedAt.slice(0, 10)}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onDeleteSession(session.id, session.title)}
                  aria-label={`Изтрий разговор ${session.title}`}
                  className="rounded-lg p-1 text-zinc-500 hover:bg-rose-500/15 hover:text-rose-400 opacity-70 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </nav>
      )}
    </aside>
  );
};
