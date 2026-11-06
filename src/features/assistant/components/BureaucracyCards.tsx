'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CalendarClock, Check, Copy, ExternalLink, FileCheck2, Languages } from 'lucide-react';
import type { DraftReply, FactCard, PortalGuide } from '../schemas/assistantSchema';

interface BureaucracyCardsProps {
  readonly facts: readonly FactCard[];
  readonly guide: PortalGuide | null;
  readonly draft: DraftReply | null;
}

export const BureaucracyCards: React.FC<BureaucracyCardsProps> = ({
  facts,
  guide,
  draft,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  if (facts.length === 0 && !guide && !draft) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      {guide && (guide.deadline || guide.steps.length > 0) && (
        <article className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-300 uppercase">
              <FileCheck2 className="h-4 w-4 text-cyan-400" aria-hidden="true" />
              <span>План за попълване / отговор</span>
            </span>
            {guide.deadline && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-mono font-bold text-amber-300">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Срок: {guide.deadline}</span>
              </span>
            )}
          </div>

          {guide.steps.length > 0 && (
            <ol className="space-y-1.5 text-xs text-zinc-200 list-decimal list-inside">
              {guide.steps.map((step, index) => (
                <li key={`${index}-${step.slice(0, 20)}`} className="leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          )}
        </article>
      )}

      {facts.length > 0 && (
        <section aria-label="Готови лични данни за копиране" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {facts.map((fact) => {
            const isCopied = copiedKey === `fact-${fact.id}`;
            return (
              <article
                key={fact.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/85 p-3.5 flex flex-col justify-between gap-2"
              >
                <div>
                  <span className="text-[11px] font-mono font-semibold text-zinc-400">
                    {fact.label}
                  </span>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <code className="text-xs sm:text-sm font-mono font-bold text-cyan-300 break-all">
                      {fact.value}
                    </code>
                    <button
                      type="button"
                      onClick={() => void copyText(`fact-${fact.id}`, fact.value)}
                      aria-label={`Копирай стойността на ${fact.label}`}
                      className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-cyan-500 hover:text-zinc-950 active:scale-95 transition-all"
                    >
                      {isCopied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>{isCopied ? 'Копирано' : 'Копирай'}</span>
                    </button>
                  </div>
                </div>

                {fact.sourceDocumentId && (
                  <div className="pt-1.5 border-t border-zinc-800/80 flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-zinc-400 truncate">
                      📄 {fact.sourceDocumentTitle ?? 'Изходен документ'}
                      {fact.sourceDocumentDate ? ` (${fact.sourceDocumentDate})` : ''}
                    </span>
                    <Link
                      href={`/documents?preview=${fact.sourceDocumentId}`}
                      aria-label={`Отвори изходния документ за ${fact.label}`}
                      className="shrink-0 inline-flex items-center gap-1 font-semibold text-cyan-400 hover:text-cyan-300"
                    >
                      <span>Документ</span>
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {draft && (
        <article className="rounded-2xl border border-cyan-500/30 bg-zinc-950/90 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-cyan-300">
              <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="text-xs font-mono font-bold uppercase">
                Официална чернова на немски (DE)
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                void copyText(
                  'draft-de',
                  draft.subjectLine
                    ? `Betreff: ${draft.subjectLine}\n\n${draft.germanText}`
                    : draft.germanText
                )
              }
              aria-label="Копирай официалния текст на немски"
              className="inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-cyan-500 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-cyan-500/15 hover:brightness-110 active:scale-95 transition-all"
            >
              {copiedKey === 'draft-de' ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>
                {copiedKey === 'draft-de' ? 'Копирано!' : 'Копирай немския текст'}
              </span>
            </button>
          </div>

          {draft.subjectLine && (
            <p className="text-xs font-mono font-bold text-white">
              Betreff: {draft.subjectLine}
            </p>
          )}

          <pre className="whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-900/90 p-3.5 text-xs font-sans text-zinc-100 leading-relaxed">
            {draft.germanText}
          </pre>

          {draft.bulgarianExplanation && (
            <p className="text-xs text-zinc-400 leading-relaxed">
              🇧🇬 <strong className="text-zinc-200">Обяснение:</strong>{' '}
              {draft.bulgarianExplanation}
            </p>
          )}
        </article>
      )}
    </div>
  );
};
