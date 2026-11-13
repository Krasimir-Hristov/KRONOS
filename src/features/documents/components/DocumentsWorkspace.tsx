'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useBulkUploadQueue } from '../hooks/useBulkUploadQueue';
import { useDocumentsCatalog } from '../hooks/useDocumentsCatalog';
import type { CatalogDocumentItem } from '../schemas/documentSchema';
import { BulkSelectionBar } from './BulkSelectionBar';
import { BulkUploadDropzone } from './BulkUploadDropzone';
import { DocumentCatalogList } from './DocumentCatalogList';
import { DocumentSearchBar } from './DocumentSearchBar';
import {
  UploadReviewQueue,
  type ApproveOutcomeSummary,
} from './UploadReviewQueue';

const DynamicDocumentPreviewModal = dynamic(
  () => import('./DocumentPreviewModal').then((m) => m.DocumentPreviewModal),
  { ssr: false }
);

interface DocumentsWorkspaceProps {
  readonly initialCatalog?: readonly CatalogDocumentItem[];
  readonly initialReviewQueue?: readonly CatalogDocumentItem[];
  readonly initialLoadError?: string | null;
  readonly initialPreviewDocId?: string | null;
  readonly isDemo?: boolean;
}

export const DocumentsWorkspace: React.FC<DocumentsWorkspaceProps> = ({
  initialCatalog,
  initialReviewQueue,
  initialLoadError = null,
  initialPreviewDocId,
  isDemo = false,
}) => {
  const t = useTranslations('documents');
  const uploadQueue = useBulkUploadQueue();
  const catalog = useDocumentsCatalog(initialCatalog, initialReviewQueue, isDemo);

  const initialMatch = initialPreviewDocId
    ? [...(initialCatalog ?? []), ...(initialReviewQueue ?? [])].find(
        (d) => d.id === initialPreviewDocId
      ) ?? null
    : null;

  const [previewDoc, setPreviewDoc] = useState<CatalogDocumentItem | null>(initialMatch);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(initialLoadError);

  const docs = catalog.catalogItems;
  const reviewItems = catalog.reviewQueueQuery.data ?? [];
  const activeErrorMessage =
    errorBanner ??
    catalog.catalogQuery.error?.message ??
    catalog.reviewQueueQuery.error?.message ??
    null;

  const handleToggleSelect = (id: string) => {
    catalog.setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const allIds = docs.map((d) => d.id);
    const allChecked =
      allIds.length > 0 && allIds.every((id) => catalog.selectedIds.includes(id));
    catalog.setSelectedIds(allChecked ? [] : allIds);
  };

  const handlePurgeIds = async (ids: readonly string[], labelForConfirm: string) => {
    if (
      !window.confirm(
        `Сигурни ли сте, че искате да изтриете ЗАВИНАГИ ${labelForConfirm} (файл от Supabase Storage + OCR текст + вектори)?`
      )
    ) {
      return;
    }
    setErrorBanner(null);
    try {
      const res = await catalog.purgeMutation.mutateAsync(ids);
      setFeedbackBanner(`Физически заличени документи (Hard Purge): ${res.purgedCount}`);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Грешка при изтриване.');
    }
  };

  const handleApproveOutcome = (outcome: ApproveOutcomeSummary) => {
    if (outcome.errorMessage) {
      setFeedbackBanner(null);
      setErrorBanner(
        `Одобрени документи: ${outcome.approvedCount} • Записани факти: ${outcome.savedFactsCount} — ${outcome.errorMessage}`
      );
      return;
    }
    setErrorBanner(null);
    setFeedbackBanner(
      `Одобрени документи: ${outcome.approvedCount} • Записани факти (дедуплицирани): ${outcome.savedFactsCount}`
    );
  };

  return (
    <section aria-label={t('title')} className="space-y-6">
      <div inert={Boolean(previewDoc)} className="space-y-6">
        <header className="relative rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-400">
                {t('engineBadge')}
              </span>
              <span className="text-xs font-mono text-zinc-500">{t('zeroCostBadge')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {t('title')}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-zinc-400 max-w-2xl">
              {t('subtitle')}
            </p>
          </div>
        </header>

        {feedbackBanner && (
          <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-300">
            {feedbackBanner}
          </p>
        )}

        {activeErrorMessage && (
          <p
            role="alert"
            className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-300"
          >
            {activeErrorMessage}
          </p>
        )}

        <BulkUploadDropzone
          tasks={uploadQueue.tasks}
          isProcessingBatch={uploadQueue.isProcessingBatch}
          onFilesSelected={uploadQueue.enqueueFiles}
          onClearFinished={uploadQueue.clearFinishedTasks}
        />

        <UploadReviewQueue
          items={reviewItems}
          isApproving={catalog.approveBatchMutation.isPending}
          isRetryingOcr={catalog.retryOcrMutation.isPending}
          onApproveBatch={(batch) => catalog.approveBatchMutation.mutateAsync(batch)}
          onApproveOutcome={handleApproveOutcome}
          onRetryOcr={async (docId) => {
            setErrorBanner(null);
            try {
              await catalog.retryOcrMutation.mutateAsync(docId);
            } catch (err) {
              setErrorBanner(
                err instanceof Error ? err.message : 'Грешка при повторен OCR анализ.'
              );
            }
          }}
          onPreview={(doc) => setPreviewDoc(doc)}
          onDelete={(docId) => handlePurgeIds([docId], 'този документ')}
        />

        <DocumentSearchBar
          searchInput={catalog.searchInput}
          topicFilter={catalog.topicFilter}
          sortBy={catalog.sortBy}
          totalCount={docs.length}
          onSearchChange={catalog.handleSearchChange}
          onTopicChange={catalog.handleTopicChange}
          onSortChange={catalog.handleSortChange}
        />

        <DocumentCatalogList
          items={docs}
          selectedIds={catalog.selectedIds}
          isLoading={catalog.catalogQuery.isLoading}
          hasNextPage={Boolean(catalog.catalogQuery.hasNextPage)}
          isFetchingNextPage={catalog.catalogQuery.isFetchingNextPage}
          onLoadMore={() => {
            void catalog.catalogQuery.fetchNextPage();
          }}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onPreview={(doc) => setPreviewDoc(doc)}
          onDownloadSingle={(doc) => {
            void catalog.downloadSingleDocument(doc).catch((err: unknown) => {
              setErrorBanner(err instanceof Error ? err.message : 'Грешка при сваляне.');
            });
          }}
          onDeleteSingle={(doc) => void handlePurgeIds([doc.id], `„${doc.title}“`)}
        />

        <BulkSelectionBar
          selectedCount={catalog.selectedIds.length}
          isBusy={catalog.isBusyExporting || catalog.purgeMutation.isPending}
          statusMessage={catalog.bulkStatusMessage}
          onClearSelection={() => catalog.setSelectedIds([])}
          onExportZip={() => {
            void catalog.exportSelectedAsZip().catch((err: unknown) => {
              setErrorBanner(err instanceof Error ? err.message : 'Грешка при ZIP експорт.');
            });
          }}
          onMergePdfDownloadOnly={() => {
            void catalog.mergeSelectedToPdf(false).catch((err: unknown) => {
              setErrorBanner(err instanceof Error ? err.message : 'Грешка при PDF обединяване.');
            });
          }}
          onMergePdfAndSaveToVault={() => {
            void catalog
              .mergeSelectedToPdf(true)
              .then(() => {
                setFeedbackBanner('Обединеният PDF е свален и запазен като копие в сейфа.');
              })
              .catch((err: unknown) => {
                setErrorBanner(err instanceof Error ? err.message : 'Грешка при PDF обединяване.');
              });
          }}
          onPurgeSelected={() =>
            void handlePurgeIds(
              catalog.selectedIds,
              `${catalog.selectedIds.length} избрани документа`
            )
          }
        />
      </div>

      {previewDoc && (
        <DynamicDocumentPreviewModal
          doc={previewDoc}
          isSaving={catalog.updateMetaMutation.isPending}
          onClose={() => setPreviewDoc(null)}
          onSaveMeta={async (input) => {
            await catalog.updateMetaMutation.mutateAsync(input);
            setFeedbackBanner('Метаданните на документа са обновени.');
          }}
        />
      )}
    </section>
  );
};
