'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Archive, CloudUpload, FileStack, Loader2, Trash2, X } from 'lucide-react';

interface BulkSelectionBarProps {
  readonly selectedCount: number;
  readonly isBusy: boolean;
  readonly statusMessage: string | null;
  readonly onClearSelection: () => void;
  readonly onExportZip: () => void;
  readonly onMergePdfDownloadOnly: () => void;
  readonly onMergePdfAndSaveToVault: () => void;
  readonly onPurgeSelected: () => void;
}

export const BulkSelectionBar: React.FC<BulkSelectionBarProps> = ({
  selectedCount,
  isBusy,
  statusMessage,
  onClearSelection,
  onExportZip,
  onMergePdfDownloadOnly,
  onMergePdfAndSaveToVault,
  onPurgeSelected,
}) => {
  const t = useTranslations('documents');

  if (selectedCount === 0) {
    return null;
  }

  return (
    <aside
      aria-label="Пакетни действия за избраните документи"
      className="sticky bottom-20 lg:bottom-6 z-30 rounded-2xl border border-cyan-500/40 bg-zinc-950/95 backdrop-blur-2xl p-4 shadow-2xl shadow-cyan-950/40"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-tr from-cyan-500 to-indigo-600 text-xs font-mono font-black text-white shadow-md shadow-cyan-500/20">
            {selectedCount}
          </span>
          <div>
            <p className="text-xs sm:text-sm font-bold text-white tracking-wide">
              {t('selectedForPortal')}
            </p>
            {statusMessage && (
              <p className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-300">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                <span>{statusMessage}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={onExportZip}
            aria-label="Свали избраните отделни файлове като ZIP архив"
            className="inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-cyan-500 via-indigo-600 to-violet-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-cyan-500/20 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
          >
            <Archive className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('downloadZipButton')}</span>
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={onMergePdfDownloadOnly}
            aria-label="Обедини избраните в 1 общ PDF и го свали"
            className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3.5 py-2 text-xs font-bold text-sky-200 hover:bg-sky-500/25 active:scale-95 disabled:opacity-50 transition-all"
          >
            <FileStack className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('mergePdfButton')}</span>
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={onMergePdfAndSaveToVault}
            aria-label="Обедини в 1 PDF, свали и запази копие в сейфа"
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 active:scale-95 disabled:opacity-50 transition-all"
          >
            <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('mergeAndSaveVaultButton')}</span>
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={onPurgeSelected}
            aria-label="Изтрий завинаги избраните документи"
            className="inline-flex items-center gap-1 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 active:scale-95 disabled:opacity-50 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('deleteSelectedButton')}</span>
          </button>

          <button
            type="button"
            onClick={onClearSelection}
            aria-label="Изчисти селекцията"
            className="rounded-xl border border-zinc-700 p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
};
