'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  Calendar,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileCode,
  Loader2,
  Trash2,
} from 'lucide-react';
import {
  DOCUMENT_TOPIC_LABELS_BG,
  DOCUMENT_TYPE_LABELS_BG,
  type CatalogDocumentItem,
} from '../schemas/documentSchema';

interface DocumentCatalogListProps {
  readonly items: readonly CatalogDocumentItem[];
  readonly selectedIds: readonly string[];
  readonly isLoading: boolean;
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly onLoadMore: () => void;
  readonly onToggleSelect: (id: string) => void;
  readonly onToggleSelectAll: () => void;
  readonly onPreview: (doc: CatalogDocumentItem) => void;
  readonly onDownloadSingle: (doc: CatalogDocumentItem) => void;
  readonly onDeleteSingle: (doc: CatalogDocumentItem) => void;
}

export const DocumentCatalogList: React.FC<DocumentCatalogListProps> = ({
  items,
  selectedIds,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onToggleSelect,
  onToggleSelectAll,
  onPreview,
  onDownloadSingle,
  onDeleteSingle,
}) => {
  const t = useTranslations('documents');

  if (isLoading && items.length === 0) {
    return (
      <p className="py-8 text-center text-sm font-mono text-zinc-500">
        {t('loadingState')}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <article className="rounded-3xl border border-zinc-850 bg-zinc-950/60 p-10 text-center backdrop-blur-xl">
        <FileCode className="mx-auto h-10 w-10 text-zinc-600 mb-3" aria-hidden="true" />
        <h3 className="text-base font-semibold text-zinc-200">
          {t('emptyState')}
        </h3>
        <p className="mt-1 text-xs text-zinc-500">{t('emptyStateHint')}</p>
      </article>
    );
  }

  const allSelected = items.length > 0 && items.every((d) => selectedIds.includes(d.id));

  return (
    <section aria-label="Списък с документи в сейфа" className="space-y-3">
      <div className="flex items-center justify-between px-2">
        <label className="inline-flex items-center gap-2.5 text-xs font-mono font-semibold text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            aria-label="Избери всички показани документи"
            className="h-4 w-4 rounded border-zinc-750 bg-zinc-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
          />
          <span>ИЗБЕРИ ВСИЧКИ ({items.length})</span>
        </label>
        <span className="text-[11px] font-mono text-zinc-500">
          ОТДЕЛНИ ФАЙЛОВЕ ЗА ОНЛАЙН ПОРТАЛИ
        </span>
      </div>

      <div className="space-y-2.5">
        {items.map((doc) => {
          const isSelected = selectedIds.includes(doc.id);
          const uploadedDate = doc.createdAt.slice(0, 10);
          return (
            <article
              key={doc.id}
              className={`rounded-2xl border p-4 transition-all ${
                isSelected
                  ? 'border-cyan-500/60 bg-linear-to-r from-cyan-950/30 via-zinc-900 to-zinc-950 shadow-md shadow-cyan-500/5'
                  : 'border-zinc-850 bg-zinc-950/70 hover:border-zinc-750 backdrop-blur-xl'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(doc.id)}
                    aria-label={`Избери документ ${doc.title}`}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                  />

                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-cyan-500/10 border border-cyan-500/25 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300">
                        {DOCUMENT_TOPIC_LABELS_BG[doc.topic]}
                      </span>
                      <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                        {DOCUMENT_TYPE_LABELS_BG[doc.docType]}
                      </span>
                      {doc.sender && (
                        <span className="text-xs font-medium text-indigo-300">
                          • {doc.sender}
                        </span>
                      )}
                      {doc.expiresAt && (
                        <span className="rounded-md bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-300">
                          Срок: {doc.expiresAt}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-white break-words">
                      {doc.title}
                    </h3>

                    {doc.summaryText && (
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {doc.summaryText}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] font-mono text-zinc-500">
                      <span className="inline-flex items-center gap-1 text-zinc-400">
                        <Calendar className="h-3.5 w-3.5 text-cyan-400/80" aria-hidden="true" />
                        <span>Дата: {doc.docDate ?? 'няма'}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Качен: {uploadedDate}</span>
                      </span>
                      <span>{(doc.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                  <button
                    type="button"
                    onClick={() => onPreview(doc)}
                    aria-label={`Преглед и редакция на ${doc.title}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white hover:border-zinc-600 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                    <span>Преглед</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownloadSingle(doc)}
                    aria-label={`Свали отделния файл ${doc.title}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Свали</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSingle(doc)}
                    aria-label={`Изтрий завинаги ${doc.title}`}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-500 hover:border-rose-500/40 hover:bg-rose-500/15 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            disabled={isFetchingNextPage}
            onClick={onLoadMore}
            aria-label={t('loadMoreButton')}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-zinc-900/90 px-5 py-2.5 text-xs font-bold text-cyan-300 hover:border-cyan-400 hover:bg-cyan-500/10 disabled:opacity-50 transition-all"
          >
            {isFetchingNextPage ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{isFetchingNextPage ? t('loadingMoreButton') : t('loadMoreButton')}</span>
          </button>
        </div>
      )}
    </section>
  );
};
