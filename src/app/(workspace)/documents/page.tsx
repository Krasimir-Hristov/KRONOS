import React from 'react';
import type { Metadata } from 'next';
import { requireAuthAndPin } from '@/features/auth/server';
import {
  DocumentsWorkspace,
  MOCK_CATALOG_DOCUMENTS,
  MOCK_REVIEW_QUEUE_DOCUMENTS,
} from '@/features/documents';

export const metadata: Metadata = {
  title: 'Документен RAG Сейф & Класическа Търсачка (UI Мок)',
  description:
    'Масово качване на PDF и снимки до 50 MB в kronos-vault, OCR на DE/BG/EL, мигновена 0 € търсачка, ZIP и PDF Merge.',
};

interface DocumentsPageProps {
  readonly searchParams: Promise<{ readonly preview?: string }>;
}

const DocumentsPage: React.FC<DocumentsPageProps> = async ({ searchParams }) => {
  await requireAuthAndPin();
  const params = await searchParams;
  const previewDocId = typeof params.preview === 'string' ? params.preview : null;

  return (
    <DocumentsWorkspace
      initialCatalog={MOCK_CATALOG_DOCUMENTS}
      initialReviewQueue={MOCK_REVIEW_QUEUE_DOCUMENTS}
      initialLoadError={null}
      initialPreviewDocId={previewDocId}
    />
  );
};

export default DocumentsPage;
