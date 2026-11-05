'use client';

import React, { useMemo, useState } from 'react';
import { Archive, Download, Eye, FileStack, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  buildPortalFileName,
  DOCUMENT_TOPIC_LABELS_BG,
  useDocumentBulkExport,
  type CatalogDocumentItem,
} from '@/features/documents';

interface TwoZoneDocumentsPanelProps {
  readonly zone1Docs: readonly CatalogDocumentItem[];
  readonly zone2Docs: readonly CatalogDocumentItem[];
  readonly portalDocs: readonly CatalogDocumentItem[];
  readonly onPreview: (doc: CatalogDocumentItem) => void;
  readonly onVaultSaved: () => Promise<void>;
}

export const TwoZoneDocumentsPanel: React.FC<TwoZoneDocumentsPanelProps> = ({
  zone1Docs,
  zone2Docs,
  portalDocs,
  onPreview,
  onVaultSaved,
}) => {
  const t = useTranslations('chat');
  const allDocs = useMemo(() => {
    const map = new Map<string, CatalogDocumentItem>();
    for (const d of [...zone1Docs, ...zone2Docs, ...portalDocs]) {
      map.set(d.id, d);
    }
    return [...map.values()];
  }, [portalDocs, zone1Docs, zone2Docs]);

  const [selectedIds, setSelectedIds] = useState<readonly string[]>(() =>
    portalDocs.length > 0
      ? portalDocs.map((d) => d.id)
      : zone1Docs.map((d) => d.id)
  );
  const [exportErr, setExportErr] = useState<string | null>(null);

  const validIdSet = useMemo(() => new Set(allDocs.map((d) => d.id)), [allDocs]);
  const activeSelectedIds = useMemo(
    () => selectedIds.filter((id) => validIdSet.has(id)),
    [selectedIds, validIdSet]
  );

  const bulkExport = useDocumentBulkExport(allDocs, activeSelectedIds, onVaultSaved);

  if (allDocs.length === 0) {
    return null;
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const clean = prev.filter((x) => validIdSet.has(x));
      return clean.includes(id) ? clean.filter((x) => x !== id) : [...clean, id];
    });
  };

  const toggleAll = () => {
    const allIds = allDocs.map((d) => d.id);
    const allChecked = allIds.every((id) => activeSelectedIds.includes(id));
    setSelectedIds(allChecked ? [] : allIds);
  };

  const runSafe = async (fn: () => Promise<void>) => {
    setExportErr(null);
    try {
      await fn();
    } catch (err) {
      setExportErr(err instanceof Error ? err.message : 'Грешка при експорт на файлове.');
    }
  };

  const renderDocCard = (doc: CatalogDocumentItem, highlightZone1: boolean) => {
    const isChecked = activeSelectedIds.includes(doc.id);
    const uploadedDate = doc.createdAt.slice(0, 10);
    return (
      <article
        key={doc.id}
        className={`rounded-2xl border p-3.5 transition-all ${
          highlightZone1
            ? 'border-cyan-500/45 bg-linear-to-r from-cyan-500/10 via-indigo-500/5 to-zinc-900/90 shadow-lg shadow-cyan-500/10'
            : 'border-zinc-800 bg-zinc-900/75 hover:border-zinc-700'
        }`}
      >
        <div className="flex items-start justify-between gap-2.5">
          <label className="flex items-start gap-2.5 cursor-pointer min-w-0 flex-1">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => toggleSelect(doc.id)}
              aria-label={`Избери документ ${doc.title}`}
              className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-cyan-500"
            />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300">
                  {DOCUMENT_TOPIC_LABELS_BG[doc.topic]}
                </span>
                {doc.sender && (
                  <span className="text-[11px] font-mono text-zinc-400">
                    • {doc.sender}
                  </span>
                )}
              </div>

              <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                {doc.title}
              </h4>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-zinc-400">
                <span>
                  📅 {t('docDateLabel')}:{' '}
                  <strong className="text-zinc-200">{doc.docDate ?? 'няма'}</strong>
                </span>
                <span>
                  ⬆️ {t('uploadedAtLabel')}:{' '}
                  <strong className="text-zinc-200">{uploadedDate}</strong>
                </span>
              </div>

              {doc.summaryText && highlightZone1 && (
                <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2 pt-0.5">
                  {doc.summaryText}
                </p>
              )}

              <p className="text-[10px] font-mono text-zinc-500 truncate">
                Портално име: {buildPortalFileName(doc)}
              </p>
            </div>
          </label>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onPreview(doc)}
              aria-label={`Преглед на ${doc.title}`}
              className="inline-flex items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-800/90 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:border-cyan-500/50 hover:text-white"
            >
              <Eye className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
              <span className="hidden sm:inline">Преглед</span>
            </button>
            <button
              type="button"
              disabled={bulkExport.isBusyExporting}
              onClick={() => void runSafe(() => bulkExport.downloadSingleDocument(doc))}
              aria-label={`Свали файл ${doc.title}`}
              className="inline-flex items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-800/90 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-cyan-500 hover:text-zinc-950 disabled:opacity-50 transition-all"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Свали</span>
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="mt-3.5 space-y-3">
      {/* Toolbar for Separate Portal Files (.ZIP) or Optional 1-PDF Merge */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/85 px-3.5 py-2.5">
        <button
          type="button"
          onClick={toggleAll}
          aria-label="Избери или изчисти всички показани документи"
          className="text-xs font-mono font-semibold text-zinc-300 hover:text-cyan-400"
        >
          Избрани: {activeSelectedIds.length} / {allDocs.length}
        </button>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={activeSelectedIds.length === 0 || bulkExport.isBusyExporting}
            onClick={() => void runSafe(() => bulkExport.exportSelectedAsZip())}
            aria-label="Свали избраните документи като отделни файлове в ZIP архив"
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/35 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500 hover:text-zinc-950 disabled:opacity-40 transition-all"
          >
            <Archive className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Свали отделни (.ZIP)</span>
          </button>

          <button
            type="button"
            disabled={activeSelectedIds.length < 2 || bulkExport.isBusyExporting}
            onClick={() => void runSafe(() => bulkExport.mergeSelectedToPdf(false))}
            aria-label="Обедини избраните документи в 1 PDF файл"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-violet-500/50 hover:text-violet-300 disabled:opacity-40 transition-all"
          >
            <FileStack className="h-3.5 w-3.5 text-violet-400" aria-hidden="true" />
            <span>Обедини в 1 PDF</span>
          </button>
        </div>
      </div>

      {bulkExport.bulkStatusMessage && (
        <p className="text-xs font-mono text-cyan-400">{bulkExport.bulkStatusMessage}</p>
      )}
      {exportErr && (
        <p role="alert" className="text-xs text-rose-400">
          {exportErr}
        </p>
      )}

      {zone1Docs.length > 0 && (
        <section aria-label={t('zone1Title')} className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('zone1Title')}</span>
          </div>
          {zone1Docs.map((doc) => renderDocCard(doc, true))}
        </section>
      )}

      {zone2Docs.length > 0 && (
        <section aria-label={t('zone2Title')} className="space-y-2 pt-1">
          <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
            📚 {t('zone2Title')}
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {zone2Docs.map((doc) => renderDocCard(doc, false))}
          </div>
        </section>
      )}

      {portalDocs.length > 0 && zone1Docs.length === 0 && (
        <section aria-label={t('portalFilesTitle')} className="space-y-2">
          <div className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
            📦 {t('portalFilesTitle')}
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {portalDocs.map((doc) => renderDocCard(doc, false))}
          </div>
        </section>
      )}
    </div>
  );
};
