'use client';

import { useState } from 'react';
import {
  downloadBytesFromSignedUrl,
  MAX_FILE_SIZE_BYTES,
  uploadFileToSignedVaultUrl,
} from '@/features/storage';
import {
  getDocumentSignedUrlAction,
  processDocumentOcrAction,
  registerUploadedDocumentAction,
  requestDocumentUploadUrlAction,
} from '../dal/documentActions';
import {
  buildPortalFileName,
  type CatalogDocumentItem,
} from '../schemas/documentSchema';
import {
  MAX_ZIP_TOTAL_BYTES,
  mergeSelectedDocumentsToPdfBytes,
  packDocumentsIntoZipBlob,
  triggerBrowserDownload,
  type BinaryDocumentSource,
} from '../utils/pdfAndZipClient';

export const useDocumentBulkExport = (
  catalogItems: readonly CatalogDocumentItem[],
  selectedIds: readonly string[],
  onVaultSaved: () => Promise<void>
) => {
  const [bulkStatusMessage, setBulkStatusMessage] = useState<string | null>(null);
  const [isBusyExporting, setIsBusyExporting] = useState(false);

  const downloadSingleDocument = async (doc: CatalogDocumentItem): Promise<void> => {
    const signed = await getDocumentSignedUrlAction({ storagePath: doc.storagePath });
    if (!signed.ok) {
      throw new Error(signed.errorMessage);
    }
    const bytes = await downloadBytesFromSignedUrl(signed.data.signedUrl);
    const buf = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buf).set(bytes);
    triggerBrowserDownload(
      new Blob([buf], { type: doc.mimeType }),
      buildPortalFileName(doc)
    );
  };

  const fetchBinarySources = async (
    docs: readonly CatalogDocumentItem[]
  ): Promise<BinaryDocumentSource[]> => {
    const sources: BinaryDocumentSource[] = [];
    for (const doc of docs) {
      const signed = await getDocumentSignedUrlAction({ storagePath: doc.storagePath });
      if (!signed.ok) {
        throw new Error(signed.errorMessage);
      }
      const bytes = await downloadBytesFromSignedUrl(signed.data.signedUrl);
      sources.push({
        fileName: buildPortalFileName(doc),
        mimeType: doc.mimeType,
        bytes,
      });
    }
    return sources;
  };

  const exportSelectedAsZip = async (): Promise<void> => {
    const docs = catalogItems.filter((d) => selectedIds.includes(d.id));
    if (docs.length === 0) {
      return;
    }

    const totalSizeBytes = docs.reduce((sum, doc) => sum + doc.fileSizeBytes, 0);
    if (totalSizeBytes > MAX_ZIP_TOTAL_BYTES) {
      throw new Error(
        'Общият размер на избраните документи надвишава лимита от 150 MB за ZIP експорт.'
      );
    }

    setIsBusyExporting(true);
    setBulkStatusMessage('Подготовка на ZIP архив с чисти имена...');
    try {
      const sources = await fetchBinarySources(docs);
      const zipBlob = await packDocumentsIntoZipBlob(sources);
      const today = new Date().toISOString().slice(0, 10);
      triggerBrowserDownload(zipBlob, `KRONOS_Dokumente_${today}.zip`);
    } finally {
      setBulkStatusMessage(null);
      setIsBusyExporting(false);
    }
  };

  const mergeSelectedToPdf = async (alsoSaveToVault: boolean): Promise<void> => {
    const docs = catalogItems.filter((d) => selectedIds.includes(d.id));
    if (docs.length === 0) {
      return;
    }

    setIsBusyExporting(true);
    setBulkStatusMessage('Обединяване на избраните документи в 1 PDF...');
    try {
      const sources = await fetchBinarySources(docs);
      const mergedBytes = await mergeSelectedDocumentsToPdfBytes(sources);
      const today = new Date().toISOString().slice(0, 10);
      const mergedFileName = `KRONOS_Merged_${today}.pdf`;

      const outBuffer = new ArrayBuffer(mergedBytes.byteLength);
      new Uint8Array(outBuffer).set(mergedBytes);
      const pdfBlob = new Blob([outBuffer], { type: 'application/pdf' });
      triggerBrowserDownload(pdfBlob, mergedFileName);

      if (alsoSaveToVault) {
        if (mergedBytes.byteLength > MAX_FILE_SIZE_BYTES) {
          throw new Error(
            'Обединеният PDF е свален, но надвишава 50 MB за запис в сейфа.'
          );
        }
        const signedUp = await requestDocumentUploadUrlAction({
          fileName: mergedFileName,
          fileSizeBytes: mergedBytes.byteLength,
          mimeType: 'application/pdf',
        });
        if (!signedUp.ok) {
          throw new Error(signedUp.errorMessage);
        }

        await uploadFileToSignedVaultUrl(
          signedUp.data.bucket,
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
        if (!reg.ok) {
          throw new Error(reg.errorMessage);
        }

        await processDocumentOcrAction({ id: reg.data.id }).catch(() => null);
        await onVaultSaved();
      }
    } finally {
      setBulkStatusMessage(null);
      setIsBusyExporting(false);
    }
  };

  return {
    downloadSingleDocument,
    exportSelectedAsZip,
    mergeSelectedToPdf,
    isBusyExporting,
    bulkStatusMessage,
  };
};
