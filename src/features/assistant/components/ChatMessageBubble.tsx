'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Bot, CheckCircle2, Trash2, User } from 'lucide-react';
import type { CatalogDocumentItem } from '@/features/documents';
import type { AssistantTier, DeleteTarget } from '../schemas/assistantSchema';
import type { ChatMessageItem } from '../schemas/assistantViewTypes';
import { BureaucracyCards } from './BureaucracyCards';
import { ChatSecretsGateCard } from './ChatSecretsGateCard';
import { TwoZoneDocumentsPanel } from './TwoZoneDocumentsPanel';

interface ChatMessageBubbleProps {
  readonly item: ChatMessageItem;
  readonly isConfirmingDelete: boolean;
  readonly onPreviewDoc: (doc: CatalogDocumentItem) => void;
  readonly onVaultSaved: () => Promise<void>;
  readonly onConfirmDelete: (input: {
    readonly target: DeleteTarget;
    readonly ids: readonly string[];
  }) => Promise<void>;
}

const TIER_LABELS: Readonly<Record<AssistantTier, string>> = {
  jev: '⚡ Jev Router',
  backup: '🛡️ Backup Supervisor',
  offline: '📴 Офлайн SQL Режим',
  local: '🔒 Локална Защита',
};

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  item,
  isConfirmingDelete,
  onPreviewDoc,
  onVaultSaved,
  onConfirmDelete,
}) => {
  const [purgedKey, setPurgedKey] = useState(false);

  if (item.role === 'user') {
    return (
      <article className="flex justify-end">
        <div className="max-w-2xl rounded-3xl rounded-tr-md bg-linear-to-r from-cyan-600/25 via-indigo-600/20 to-violet-600/20 border border-cyan-500/30 px-4 py-3 text-xs sm:text-sm text-zinc-100 shadow-lg">
          <div className="flex items-center justify-end gap-1.5 text-[10px] font-mono text-cyan-300 mb-1">
            <span>Вие</span>
            <User className="h-3 w-3" aria-hidden="true" />
          </div>
          <p className="whitespace-pre-wrap leading-relaxed">{item.content}</p>
        </div>
      </article>
    );
  }

  const payload = item.payload;
  const deptLabel =
    payload?.department === 'german_bureaucracy'
      ? '🏛️ Немска Бюрокрация'
      : '🔎 Сейф & Данни';

  return (
    <article className="flex justify-start">
      <div className="w-full max-w-4xl rounded-3xl rounded-tl-md border border-zinc-800/90 bg-zinc-950/85 p-4 sm:p-5 shadow-xl backdrop-blur-xl">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/70 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-linear-to-tr from-cyan-500 to-indigo-600 text-white">
              <Bot className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-xs font-bold text-white tracking-wide">KRONOS</span>
            <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
              {deptLabel}
            </span>
          </div>
          {payload && (
            <span className="text-[10px] font-mono text-cyan-400">
              {TIER_LABELS[payload.tier]}
            </span>
          )}
        </header>

        {payload?.errorCode === 'AI_UNAVAILABLE' && (
          <div
            role="status"
            className="mb-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <span>
              Външните AI модели в OpenRouter са временно недостъпни — резултатите са извлечени директно от вашата база данни.
            </span>
          </div>
        )}

        <p className="whitespace-pre-wrap text-xs sm:text-sm text-zinc-200 leading-relaxed">
          {item.content}
        </p>

        {payload && (
          <BureaucracyCards
            facts={payload.facts}
            guide={payload.guide}
            draft={payload.draft}
          />
        )}

        <TwoZoneDocumentsPanel
          zone1Docs={item.zone1Docs}
          zone2Docs={item.zone2Docs}
          portalDocs={item.portalDocs}
          onPreview={onPreviewDoc}
          onVaultSaved={onVaultSaved}
        />

        {payload?.actions.map((action, idx) => {
          if (action.kind === 'secrets_gate') {
            return (
              <ChatSecretsGateCard
                key={`sec-${idx}`}
                initialMode={action.mode}
                searchHint={action.searchHint}
              />
            );
          }

          if (action.kind === 'notice') {
            return (
              <div
                key={`notice-${idx}`}
                className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-200"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                  <span>{action.text}</span>
                </div>
                {action.documentId && (
                  <Link
                    href={`/documents?preview=${action.documentId}`}
                    aria-label="Отвори документа в Документния Сейф"
                    className="font-mono font-bold text-cyan-300 hover:text-cyan-200"
                  >
                    Отвори в /documents →
                  </Link>
                )}
              </div>
            );
          }

          return (
            <div
              key={`del-${idx}`}
              className="mt-3 rounded-2xl border border-rose-500/35 bg-rose-950/25 p-3.5 space-y-2.5"
            >
              <p className="text-xs font-semibold text-rose-200">
                За необратимо заличаване (100% Hard Purge):{' '}
                <span className="font-mono text-white">
                  {action.labels.join(', ')}
                </span>
              </p>
              {purgedKey ? (
                <p className="text-xs font-mono text-emerald-400">
                  ✓ Заявката за Hard Purge е изпълнена.
                </p>
              ) : (
                <button
                  type="button"
                  disabled={isConfirmingDelete}
                  onClick={async () => {
                    await onConfirmDelete({
                      target: action.target,
                      ids: action.ids,
                    });
                    setPurgedKey(true);
                  }}
                  aria-label="Потвърди необратимо физическо изтриване"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-500 active:scale-95 disabled:opacity-50 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {isConfirmingDelete
                      ? 'Заличаване...'
                      : 'Потвърди 100% Изтриване (Hard Purge)'}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
};
