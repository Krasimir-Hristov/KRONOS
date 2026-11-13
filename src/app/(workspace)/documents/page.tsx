import React from 'react';
import type { Metadata } from 'next';
import { requireAuthAndPin } from '@/features/auth/server';
import {
  DocumentsWorkspace,
  MOCK_CATALOG_DOCUMENTS,
  MOCK_REVIEW_QUEUE_DOCUMENTS,
  type CatalogDocumentItem,
} from '@/features/documents';
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
  readonly searchParams: Promise<{ readonly preview?: string; readonly demo?: string }>;
}

const DocumentsPage: React.FC<DocumentsPageProps> = async ({ searchParams }) => {
  await requireAuthAndPin();
  const params = await searchParams;
  const previewDocId = typeof params.preview === 'string' ? params.preview : null;
  const isDemo = params.demo === 'true';

  let initialCatalog: readonly CatalogDocumentItem[] = [];
  let initialReviewQueue: readonly CatalogDocumentItem[] = [];
  let initialLoadError: string | null = null;

  if (isDemo) {
    initialCatalog = MOCK_CATALOG_DOCUMENTS;
    initialReviewQueue = MOCK_REVIEW_QUEUE_DOCUMENTS;
  } else {
    try {
      const [catalogDocs, reviewDocs] = await Promise.all([
        searchCatalogDocumentsClassic({
          query: '',
          sortBy: 'doc_date_desc',
          limit: 50,
          offset: 0,
        }),
        listReviewQueueDocuments(),
      ]);
      initialCatalog = catalogDocs;
      initialReviewQueue = reviewDocs;
    } catch (err) {
      initialLoadError =
        err instanceof Error ? err.message : 'Грешка при зареждане на документите.';
    }
  }

  return (
    <DocumentsWorkspace
      initialCatalog={initialCatalog}
      initialReviewQueue={initialReviewQueue}
      initialLoadError={initialLoadError}
      initialPreviewDocId={previewDocId}
      isDemo={isDemo}
    />
  );
};

export default DocumentsPage;
