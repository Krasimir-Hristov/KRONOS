'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  downloadBytesFromSignedUrl,
  MAX_FILE_SIZE_BYTES,
  uploadFileToSignedVaultUrl,
} from '@/features/storage';
import { VAULT_QUERY_KEYS } from '@/features/vault';
import {
  approveDocumentsBatchAction,
  fetchReviewQueueAction,
  getDocumentSignedUrlAction,
  processDocumentOcrAction,
  purgeDocumentsAction,
  registerUploadedDocumentAction,
  requestDocumentUploadUrlAction,
  searchDocumentsClassicAction,
  updateDocumentMetaAction,
} from '../dal/documentActions';
import {
  buildPortalFileName,
  type ApproveDocumentItemInput,
  type CatalogDocumentItem,
  type DocumentSortMode,
  type DocumentTopic,
  type UpdateDocumentMetaInput,
} from '../schemas/documentSchema';
import {
  mergeSelectedDocumentsToPdfBytes,
  packDocumentsIntoZipBlob,
  triggerBrowserDownload,
  type BinaryDocumentSource,
} from '../utils/pdfAndZipClient';

export const DOCUMENTS_QUERY_KEYS = {
  catalog: (query: string, topic: string, sortBy: DocumentSortMode) =>
    ['documents', 'catalog', query, topic, sortBy] as const,
  reviewQueue: ['documents', 'reviewQueue'] as const,
};

export const useDocumentsCatalog = (
  initialCatalog: readonly CatalogDocumentItem[],
  initialReviewQueue: readonly CatalogDocumentItem[]
) => {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState<DocumentTopic | ''>('');
  const [sortBy, setSortBy] = useState<DocumentSortMode>('doc_date_desc');
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [bulkStatusMessage, setBulkStatusMessage] = useState<string | null>(null);
  const [isBusyExporting, setIsBusyExporting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const isDefaultFilter =
    debouncedQuery === '' && topicFilter === '' && sortBy === 'doc_date_desc';

  const catalogQuery = useQuery({
    queryKey: DOCUMENTS_QUERY_KEYS.catalog(debouncedQuery, topicFilter, sortBy),
    queryFn: async () => {
      const res = await searchDocumentsClassicAction({
        query: debouncedQuery,
        topic: topicFilter || undefined,
        sortBy,
      });
      if (!res.ok) throw new Error(res.errorMessage);
      return res.data;
    },
    initialData: isDefaultFilter ? initialCatalog : undefined,
  });

  const reviewQueueQuery = useQuery({
    queryKey: DOCUMENTS_QUERY_KEYS.reviewQueue,
    queryFn: async () => {
      const res = await fetchReviewQueueAction();
      if (!res.ok) throw new Error(res.errorMessage);
      return res.data;
    },
    initialData: initialReviewQueue,
  });

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['documents'] });
    await queryClient.invalidateQueries({ queryKey: VAULT_QUERY_KEYS.facts });
  };

  const approveBatchMutation = useMutation({
    mutationFn: async (items: readonly ApproveDocumentItemInput[]) => {
      const res = await approveDocumentsBatchAction({ items });
      if (!res.ok) throw new Error(res.errorMessage);
      return res.data;
    },
    onSuccess: invalidateAll,
  });

  const retryOcrMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const res = await processDocumentOcrAction({ id: documentId });
      if (!res.ok) throw new Error(res.errorMessage);
      return res.data;
    },
    onSuccess: invalidateAll,
  });

  const updateMetaMutation = useMutation({
    mutationFn: async (input: UpdateDocumentMetaInput) => {
      const res = await updateDocumentMetaAction(input);
      if (!res.ok) throw new Error(res.errorMessage);
    },
    onSuccess: invalidateAll,
  });

  const purgeMutation = useMutation({
    mutationFn: async (ids: readonly string[]) => {
      const res = await purgeDocumentsAction({ ids });
      if (!res.ok) throw new Error(res.errorMessage);
      return res.data;
    },
    onSuccess: async (_, purgedIds) => {
      setSelectedIds((prev) => prev.filter((id) => !purgedIds.includes(id)));
      await invalidateAll();
    },
  });

  const downloadSingleDocument = async (doc: CatalogDocumentItem) => {
    const signed = await getDocumentSignedUrlAction({ storagePath: doc.storagePath });
    if (!signed.ok) throw new Error(signed.errorMessage);
    const bytes = await downloadBytesFromSignedUrl(signed.data.signedUrl);
    const buf = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buf).set(bytes);
    triggerBrowserDownload(
      new Blob([buf], { type: doc.mimeType }),
      buildPortalFileName(doc)
    );
  };

  const fetchSelectedBinarySources = async (): Promise<BinaryDocumentSource[]> => {
    const docs = (catalogQuery.data ?? []).filter((d) => selectedIds.includes(d.id));
    const sources: BinaryDocumentSource[] = [];
    for (const doc of docs) {
      const signed = await getDocumentSignedUrlAction({ storagePath: doc.storagePath });
      if (!signed.ok) throw new Error(signed.errorMessage);
      const bytes = await downloadBytesFromSignedUrl(signed.data.signedUrl);
      sources.push({
        fileName: buildPortalFileName(doc),
        mimeType: doc.mimeType,
        bytes,
      });
    }
    return sources;
  };

  const exportSelectedAsZip = async () => {
    setIsBusyExporting(true);
    setBulkStatusMessage('Подготовка на ZIP архив с чисти имена...');
    try {
      const sources = await fetchSelectedBinarySources();
      const zipBlob = await packDocumentsIntoZipBlob(sources);
      const today = new Date().toISOString().slice(0, 10);
      triggerBrowserDownload(zipBlob, `KRONOS_Dokumente_${today}.zip`);
      setBulkStatusMessage(null);
    } finally {
      setIsBusyExporting(false);
    }
  };

  const mergeSelectedToPdf = async (alsoSaveToVault: boolean) => {
    setIsBusyExporting(true);
    setBulkStatusMessage('Обединяване на избраните документи в 1 PDF...');
    try {
      const sources = await fetchSelectedBinarySources();
      const mergedBytes = await mergeSelectedDocumentsToPdfBytes(sources);
      const today = new Date().toISOString().slice(0, 10);
      const mergedFileName = `KRONOS_Merged_${today}.pdf`;

      const outBuffer = new ArrayBuffer(mergedBytes.byteLength);
      new Uint8Array(outBuffer).set(mergedBytes);
      const pdfBlob = new Blob([outBuffer], { type: 'application/pdf' });
      triggerBrowserDownload(pdfBlob, mergedFileName);

      if (alsoSaveToVault) {
        if (mergedBytes.byteLength > MAX_FILE_SIZE_BYTES) {
          throw new Error('Обединеният PDF е свален, но надвишава 50 MB за запис в сейфа.');
        }
        const signedUp = await requestDocumentUploadUrlAction({
          fileName: mergedFileName,
          fileSizeBytes: mergedBytes.byteLength,
          mimeType: 'application/pdf',
        });
        if (!signedUp.ok) throw new Error(signedUp.errorMessage);

        await uploadFileToSignedVaultUrl(
          signedUp.data.storagePath,
          signedUp.data.token,
          pdfBlob,
          'application/pdf'
        );
        const reg = await registerUploadedDocumentAction({
          storagePath: signedUp.data.storagePath,
          originalFileName: mergedFileName,
          mimeType: 'application/pdf',
          fileSizeBytes: mergedBytes.byteLength,
          autoApprove: true,
          customTitle: `Обединен PDF пакет (${sources.length} документа — ${today})`,
        });
        if (!reg.ok) throw new Error(reg.errorMessage);
        await processDocumentOcrAction({ id: reg.data.id });
        await invalidateAll();
      }
      setBulkStatusMessage(null);
    } finally {
      setIsBusyExporting(false);
    }
  };

  return {
    searchInput,
    setSearchInput,
    topicFilter,
    setTopicFilter,
    sortBy,
    setSortBy,
    selectedIds,
    setSelectedIds,
    catalogQuery,
    reviewQueueQuery,
    approveBatchMutation,
    retryOcrMutation,
    updateMetaMutation,
    purgeMutation,
    downloadSingleDocument,
    exportSelectedAsZip,
    mergeSelectedToPdf,
    isBusyExporting,
    bulkStatusMessage,
  };
};
