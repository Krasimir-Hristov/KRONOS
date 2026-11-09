'use client';

import React, { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Camera,
  CheckCircle2,
  FileUp,
  Loader2,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { FILE_INPUT_ACCEPT_STRING } from '@/features/storage';
import { useIsMobileCameraDevice } from '@/lib/ui/useIsMobileCameraDevice';
import type {
  EnqueueFilesResult,
  UploadQueueTask,
} from '../hooks/useBulkUploadQueue';
import { combineCameraImagesToPdfFile } from '../utils/pdfAndZipClient';

interface BulkUploadDropzoneProps {
  readonly tasks: readonly UploadQueueTask[];
  readonly isProcessingBatch: boolean;
  readonly onFilesSelected: (files: readonly File[]) => Promise<EnqueueFilesResult>;
  readonly onClearFinished: () => void;
}

export const BulkUploadDropzone: React.FC<BulkUploadDropzoneProps> = ({
  tasks,
  isProcessingBatch,
  onFilesSelected,
  onClearFinished,
}) => {
  const t = useTranslations('documents');
  const isMobileCamera = useIsMobileCameraDevice();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cameraPages, setCameraPages] = useState<readonly File[]>([]);
  const [cameraDocTitle, setCameraDocTitle] = useState('');
  const [isBuildingPdf, setIsBuildingPdf] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) {
      await onFilesSelected(dropped);
    }
  };

  const handleCameraAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const added = Array.from(e.target.files ?? []);
    if (added.length > 0) {
      setCameraPages((prev) => [...prev, ...added]);
      setCameraError(null);
    }
    e.target.value = '';
  };

  const handleCombineAndUpload = async () => {
    setIsBuildingPdf(true);
    setCameraError(null);
    try {
      const combinedPdf = await combineCameraImagesToPdfFile(
        cameraPages,
        cameraDocTitle || `Писмо_${new Date().toISOString().slice(0, 10)}`
      );
      const res = await onFilesSelected([combinedPdf]);
      if (res.uploadedCount > 0 && res.failedCount === 0) {
        setCameraPages([]);
        setCameraDocTitle('');
      } else {
        setCameraError(
          'Качването не успя. Заснетите страници и заглавието са запазени — опитайте отново.'
        );
      }
    } catch (err) {
      setCameraError(
        err instanceof Error
          ? err.message
          : 'Грешка при обединяване на снимките в PDF.'
      );
    } finally {
      setIsBuildingPdf(false);
    }
  };

  return (
    <section aria-label="Масово качване на документи" className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => void handleDrop(e)}
        className={`relative rounded-3xl border-2 border-dashed p-6 sm:p-8 transition-all overflow-hidden ${
          isDragging
            ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/15'
            : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-700 backdrop-blur-xl'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 shadow-md shadow-cyan-500/10">
              <UploadCloud className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  {t('dropzoneTitle')}
                </h2>
                <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-400">
                  {t('dropzoneLimitBadge')}
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                {t('dropzoneText')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={FILE_INPUT_ACCEPT_STRING}
              aria-label="Избор на файлове за качване"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                e.target.value = '';
                if (picked.length > 0) void onFilesSelected(picked);
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Избери документи, снимки или таблици от устройството"
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-cyan-500 via-indigo-600 to-violet-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 hover:brightness-110 active:scale-95 transition-all"
            >
              <FileUp className="h-4 w-4" aria-hidden="true" />
              <span>{t('uploadButton')}</span>
            </button>

            {isMobileCamera && (
              <>
                <input
                  ref={cameraInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  capture="environment"
                  aria-label="Снимай страници на писмо от телефон"
                  onChange={handleCameraAdd}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  aria-label="Снимай многостранично хартиено писмо в 1 PDF"
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-4 py-2.5 text-xs sm:text-sm font-semibold text-zinc-200 hover:border-cyan-500/40 hover:text-cyan-300 active:scale-95 transition-all"
                >
                  <Camera className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                  <span>{t('cameraPdfButton')}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {cameraPages.length > 0 && (
          <div className="mt-5 rounded-2xl border border-cyan-500/30 bg-zinc-900/90 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold text-cyan-300">
                Заснети страници: {cameraPages.length} стр.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  aria-label="Добави още една страница"
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:text-white"
                >
                  + Още страница
                </button>
                <button
                  type="button"
                  onClick={() => setCameraPages([])}
                  aria-label="Изчисти сниманите страници"
                  className="rounded-xl border border-rose-500/30 px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={cameraDocTitle}
                onChange={(e) => setCameraDocTitle(e.target.value)}
                aria-label="Име на многостраничния PDF документ"
                placeholder="Име на файла (напр. Писмо_Familienkasse)"
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-base md:text-xs text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="button"
                disabled={isBuildingPdf || isProcessingBatch}
                onClick={() => void handleCombineAndUpload()}
                aria-label="Сглоби в 1 PDF и качи"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:brightness-110 disabled:opacity-50"
              >
                {isBuildingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{isBuildingPdf ? 'Сглобяване...' : 'Сглоби в 1 PDF & Качи'}</span>
              </button>
            </div>

            {cameraError && (
              <p role="alert" className="text-xs text-rose-400">
                {cameraError}
              </p>
            )}
          </div>
        )}
      </div>

      {tasks.length > 0 && (
        <article className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-2.5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-zinc-300">
              ОПАШКА ({tasks.length}) {isProcessingBatch ? '• ОБРАБОТКА...' : ''}
            </span>
            {!isProcessingBatch && (
              <button
                type="button"
                onClick={onClearFinished}
                aria-label="Скрий приключилите задачи"
                className="text-xs font-mono text-zinc-500 hover:text-zinc-300"
              >
                Изчисти завършените
              </button>
            )}
          </div>

          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
            {tasks.map((task) => (
              <div
                key={task.localId}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-850 bg-zinc-900/80 px-3 py-2 text-xs"
              >
                <span className="font-mono text-zinc-300 truncate">{task.fileName}</span>
                <span className="inline-flex items-center gap-1.5 shrink-0 text-zinc-400 font-mono text-[11px]">
                  {(task.step === 'uploading' || task.step === 'analyzing') && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" aria-hidden="true" />
                  )}
                  {task.step === 'completed' && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  )}
                  <span className={task.step === 'error' ? 'text-rose-400' : ''}>
                    {task.detailMessage ?? 'Изчакване...'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </article>
      )}
    </section>
  );
};
