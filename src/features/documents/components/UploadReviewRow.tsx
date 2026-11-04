'use client';

import React from 'react';
import { Check, Eye, RefreshCw, Trash2 } from 'lucide-react';
import {
  DOCUMENT_TOPIC_LABELS_BG,
  DOCUMENT_TOPICS,
  DOCUMENT_TYPE_LABELS_BG,
  DOCUMENT_TYPES,
  type CatalogDocumentItem,
  type DocumentTopic,
  type DocumentType,
  type SuggestedFactItem,
} from '../schemas/documentSchema';

export interface ReviewDraftState {
  readonly title: string;
  readonly topic: DocumentTopic;
  readonly docType: DocumentType;
  readonly sender: string;
  readonly docDate: string;
  readonly expiresAt: string;
  readonly selectedFactIndices: readonly number[];
}

interface UploadReviewRowProps {
  readonly doc: CatalogDocumentItem;
  readonly draft: ReviewDraftState;
  readonly isBusy: boolean;
  readonly onChangeDraft: (next: ReviewDraftState) => void;
  readonly onApproveSingle: () => void;
  readonly onRetryOcr: () => void;
  readonly onPreview: () => void;
  readonly onDelete: () => void;
}

export const UploadReviewRow: React.FC<UploadReviewRowProps> = ({
  doc,
  draft,
  isBusy,
  onChangeDraft,
  onApproveSingle,
  onRetryOcr,
  onPreview,
  onDelete,
}) => {
  const facts: readonly SuggestedFactItem[] = doc.reviewMeta.suggestedFacts;

  const toggleFactIndex = (idx: number) => {
    const exists = draft.selectedFactIndices.includes(idx);
    const nextIndices = exists
      ? draft.selectedFactIndices.filter((i) => i !== idx)
      : [...draft.selectedFactIndices, idx];
    onChangeDraft({ ...draft, selectedFactIndices: nextIndices });
  };

  return (
    <article className="rounded-2xl border border-cyan-500/25 bg-zinc-950/80 p-4 space-y-3 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-mono text-cyan-400 truncate max-w-md">
          {doc.originalFileName} ({(doc.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB)
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPreview}
            aria-label={`Прегледай файла ${doc.title}`}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:text-white hover:border-zinc-500"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Преглед</span>
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={onRetryOcr}
            aria-label={`Повтори OCR за ${doc.title}`}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:text-cyan-300 hover:border-cyan-500/40 disabled:opacity-40"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>OCR Отново</span>
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={onDelete}
            aria-label={`Изтрий завинаги ${doc.title}`}
            className="rounded-lg border border-rose-500/30 bg-zinc-900 p-1 text-rose-400 hover:bg-rose-500/20 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={onApproveSingle}
            aria-label={`Одобри документа ${draft.title}`}
            className="inline-flex items-center gap-1 rounded-lg bg-linear-to-r from-emerald-500 to-teal-600 px-3 py-1 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:brightness-110 disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Одобри</span>
          </button>
        </div>
      </div>

      {doc.reviewMeta.aiError && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
          Бележка: {doc.reviewMeta.aiError}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-mono text-zinc-400 mb-1">Заглавие</label>
          <input
            type="text"
            aria-label={`Заглавие за ${doc.originalFileName}`}
            value={draft.title}
            onChange={(e) => onChangeDraft({ ...draft, title: e.target.value })}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1">Тема</label>
          <select
            aria-label={`Тема за ${doc.originalFileName}`}
            value={draft.topic}
            onChange={(e) =>
              onChangeDraft({ ...draft, topic: e.target.value as DocumentTopic })
            }
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
          >
            {DOCUMENT_TOPICS.map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TOPIC_LABELS_BG[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1">Вид</label>
          <select
            aria-label={`Вид документ за ${doc.originalFileName}`}
            value={draft.docType}
            onChange={(e) =>
              onChangeDraft({ ...draft, docType: e.target.value as DocumentType })
            }
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
          >
            {DOCUMENT_TYPES.map((dt) => (
              <option key={dt} value={dt}>
                {DOCUMENT_TYPE_LABELS_BG[dt]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1">Подател</label>
          <input
            type="text"
            aria-label={`Подател за ${doc.originalFileName}`}
            value={draft.sender}
            onChange={(e) => onChangeDraft({ ...draft, sender: e.target.value })}
            placeholder="Sparkasse / Amt"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1">Дата</label>
          <input
            type="date"
            aria-label={`Дата на документа за ${doc.originalFileName}`}
            value={draft.docDate}
            onChange={(e) => onChangeDraft({ ...draft, docDate: e.target.value })}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1">Краен срок</label>
          <input
            type="date"
            aria-label={`Краен срок за ${doc.originalFileName}`}
            value={draft.expiresAt}
            onChange={(e) => onChangeDraft({ ...draft, expiresAt: e.target.value })}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {facts.length > 0 && (
        <div className="pt-1">
          <span className="block text-[11px] font-mono font-semibold text-cyan-300 mb-1.5">
            ИЗВЛЕЧЕНИ ФАКТИ (запис без дублиране във Vault):
          </span>
          <div className="flex flex-wrap gap-2">
            {facts.map((fact, idx) => {
              const checked = draft.selectedFactIndices.includes(idx);
              return (
                <button
                  key={`${fact.label}-${idx}`}
                  type="button"
                  onClick={() => toggleFactIndex(idx)}
                  aria-label={`Превключи факт ${fact.label}: ${fact.value}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                    checked
                      ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-500 line-through'
                  }`}
                >
                  <span className="font-semibold">{fact.label}:</span>
                  <span className="font-mono">{fact.value}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
};
