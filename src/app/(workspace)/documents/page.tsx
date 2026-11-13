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

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs = 2500): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Времето за връзка към базата данни изтече.')), timeoutMs);
    }),
  ]);
};

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
    const [catalogResult, reviewResult] = await Promise.allSettled([
      withTimeout(
        searchCatalogDocumentsClassic({
          query: '',
          sortBy: 'doc_date_desc',
          limit: 50,
          offset: 0,
        })
      ),
      withTimeout(listReviewQueueDocuments()),
    ]);

    if (catalogResult.status === 'fulfilled') {
      initialCatalog = catalogResult.value;
    } else {
      initialLoadError =
        catalogResult.reason instanceof Error
          ? catalogResult.reason.message
          : 'Грешка при зареждане на каталога с документи.';
    }

    if (reviewResult.status === 'fulfilled') {
      initialReviewQueue = reviewResult.value;
    } else if (!initialLoadError) {
      initialLoadError =
        reviewResult.reason instanceof Error
          ? reviewResult.reason.message
          : 'Грешка при зареждане на опашката за одобрение.';
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
