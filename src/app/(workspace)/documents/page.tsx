import React from 'react';
import type { Metadata } from 'next';
import { requireAuthAndPin } from '@/features/auth/server';
import {
  CLASSIC_SEARCH_PAGE_SIZE,
  DocumentsWorkspace,
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
  readonly searchParams: Promise<{ readonly preview?: string }>;
}

const loadInitialDocumentsData = async (): Promise<{
  readonly initialCatalog?: readonly CatalogDocumentItem[];
  readonly initialReviewQueue?: readonly CatalogDocumentItem[];
  readonly initialLoadError: string | null;
}> => {
  const [catalogResult, reviewResult] = await Promise.allSettled([
    searchCatalogDocumentsClassic({
      query: '',
      sortBy: 'doc_date_desc',
      limit: CLASSIC_SEARCH_PAGE_SIZE,
      offset: 0,
    }),
    listReviewQueueDocuments(),
  ]);

  const errors: string[] = [];
  let initialCatalog: readonly CatalogDocumentItem[] | undefined;
  let initialReviewQueue: readonly CatalogDocumentItem[] | undefined;

  if (catalogResult.status === 'fulfilled') {
    initialCatalog = catalogResult.value;
  } else {
    console.error('[DocumentsPage] Failed to load initial catalog:', catalogResult.reason);
    errors.push('Неуспешно зареждане на каталога с документи.');
  }

  if (reviewResult.status === 'fulfilled') {
    initialReviewQueue = reviewResult.value;
  } else {
    console.error(
      '[DocumentsPage] Failed to load initial review queue:',
      reviewResult.reason
    );
    errors.push('Неуспешно зареждане на опашката за преглед.');
  }

  return {
    initialCatalog,
    initialReviewQueue,
    initialLoadError: errors.length > 0 ? errors.join(' ') : null,
  };
};

const DocumentsPage: React.FC<DocumentsPageProps> = async ({ searchParams }) => {
  await requireAuthAndPin();
  const params = await searchParams;
  const previewDocId = typeof params.preview === 'string' ? params.preview : null;
  const { initialCatalog, initialReviewQueue, initialLoadError } =
    await loadInitialDocumentsData();

  return (
    <DocumentsWorkspace
      initialCatalog={initialCatalog}
      initialReviewQueue={initialReviewQueue}
      initialLoadError={initialLoadError}
      initialPreviewDocId={previewDocId}
    />
  );
};

export default DocumentsPage;
