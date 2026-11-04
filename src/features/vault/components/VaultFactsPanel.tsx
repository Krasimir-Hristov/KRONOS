'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, ExternalLink, FileCode, Pencil, Trash2 } from 'lucide-react';
import type { VaultFactItem } from '../schemas/vaultSchema';
import { CATEGORY_LABELS_BG } from './VaultItemModal';

interface VaultFactsPanelProps {
  readonly items: readonly VaultFactItem[];
  readonly isDeletingId: string | null;
  readonly onEdit: (item: VaultFactItem) => void;
  readonly onDelete: (item: VaultFactItem) => void;
}

export const VaultFactsPanel: React.FC<VaultFactsPanelProps> = ({
  items,
  isDeletingId,
  onEdit,
  onDelete,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (item: VaultFactItem) => {
    try {
      await navigator.clipboard.writeText(item.valuePlain);
      setCopiedId(item.id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === item.id ? null : prev));
      }, 2000);
    } catch {
      // Clipboard fallback
    }
  };

  if (items.length === 0) {
    return (
      <article className="rounded-3xl border border-zinc-850 bg-zinc-950/60 p-8 text-center backdrop-blur-xl">
        <p className="text-sm font-mono text-zinc-500">
          Все още няма запазени факти. Добавете нов или качете документи в сейфа за автоматично извличане.
        </p>
      </article>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((item) => {
        const isCopied = copiedId === item.id;
        return (
          <article
            key={item.id}
            className="flex flex-col justify-between rounded-2xl border border-zinc-850 bg-zinc-950/70 p-5 shadow-lg backdrop-blur-xl hover:border-zinc-700 transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center rounded-md bg-cyan-500/10 border border-cyan-500/25 px-2.5 py-0.5 text-[10px] font-mono font-bold text-cyan-300">
                  {CATEGORY_LABELS_BG[item.category]}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    aria-label={`Редактирай ${item.label}`}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingId === item.id}
                    onClick={() => onDelete(item)}
                    aria-label={`Изтрий завинаги ${item.label}`}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/15 hover:text-rose-400 transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <h3 className="mt-2.5 text-sm font-bold text-white tracking-wide">{item.label}</h3>
              {item.usernameOrHint && (
                <p className="mt-0.5 text-xs text-zinc-400">{item.usernameOrHint}</p>
              )}

              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2.5">
                <code className="text-sm font-mono font-bold text-emerald-400 break-all">
                  {item.valuePlain}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(item)}
                  aria-label={`Копирай стойността за ${item.label}`}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-cyan-500 hover:text-zinc-950 active:scale-95 transition-all"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      <span className="text-emerald-400">Копирано</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Копирай</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {item.sourceDocumentId !== null && (
              <div className="mt-3.5 pt-3 border-t border-zinc-850 flex items-center justify-between">
                <Link
                  href={`/documents?preview=${item.sourceDocumentId}`}
                  aria-label={`Отвори изходния документ за ${item.label}`}
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <FileCode className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate max-w-[230px]">
                    {item.sourceDocumentTitle ?? 'Преглед на изходния документ'}
                  </span>
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                </Link>
                {item.sourceDocumentDate && (
                  <span className="text-[11px] font-mono text-zinc-500">{item.sourceDocumentDate}</span>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
};
