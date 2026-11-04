import React from 'react';
import type { Metadata } from 'next';
import { requireAuthAndPin } from '@/features/auth/server';
import { DocumentsWorkspace, type CatalogDocumentItem } from '@/features/documents';
import {
  listReviewQueueDocuments,
  searchCatalogDocumentsClassic,
} from '@/features/documents/server';

export const metadata: Metadata = {
  title: 'Документен RAG Сейф & Класическа Търсачка',
  description:
    'Масово качване на PDF и снимки до 50 MB в kronos-vault, OCR на DE/BG/EL, мигновена 0 € търсачка, ZIP и PDF Merge.',
};

interface DocumentsPageProps {
  readonly searchParams: Promise<{ readonly preview?: string }>;
}

const loadInitialDocumentsData = async (): Promise<{
  readonly initialCatalog: readonly CatalogDocumentItem[];
  readonly initialReviewQueue: readonly CatalogDocumentItem[];
}> => {
  try {
    const [initialCatalog, initialReviewQueue] = await Promise.all([
      searchCatalogDocumentsClassic({ query: '', sortBy: 'doc_date_desc' }),
      listReviewQueueDocuments(),
    ]);
    return { initialCatalog, initialReviewQueue };
  } catch {
    return { initialCatalog: [], initialReviewQueue: [] };
  }
};

const DocumentsPage: React.FC<DocumentsPageProps> = async ({ searchParams }) => {
  await requireAuthAndPin();
  const params = await searchParams;
  const previewDocId = typeof params.preview === 'string' ? params.preview : null;
  const { initialCatalog, initialReviewQueue } = await loadInitialDocumentsData();

  return (
    <DocumentsWorkspace
      initialCatalog={initialCatalog}
      initialReviewQueue={initialReviewQueue}
      initialPreviewDocId={previewDocId}
    />
  );
};

export default DocumentsPage;
