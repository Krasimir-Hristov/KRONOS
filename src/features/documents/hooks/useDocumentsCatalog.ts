'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { VAULT_QUERY_KEYS } from '@/features/vault';
import {
  approveDocumentsBatchAction,
  fetchReviewQueueAction,
  processDocumentOcrAction,
  purgeDocumentsAction,
  searchDocumentsClassicAction,
  updateDocumentMetaAction,
} from '../dal/documentActions';
import {
  CLASSIC_SEARCH_PAGE_SIZE,
  type ApproveDocumentItemInput,
  type CatalogDocumentItem,
  type DocumentSortMode,
  type DocumentTopic,
  type UpdateDocumentMetaInput,
} from '../schemas/documentSchema';
import {
  MOCK_CATALOG_DOCUMENTS,
  MOCK_REVIEW_QUEUE_DOCUMENTS,
} from '../utils/mockDocumentsCatalog';
import { useDocumentBulkExport } from './useDocumentBulkExport';

export const DOCUMENTS_QUERY_KEYS = {
  catalog: (
    query: string,
    topic: string,
    sortBy: DocumentSortMode,
    isDemo: boolean
  ) => ['documents', 'catalog', query, topic, sortBy, isDemo ? 'demo' : 'live'] as const,
  reviewQueue: (isDemo: boolean) =>
    ['documents', 'reviewQueue', isDemo ? 'demo' : 'live'] as const,
};

const sortCatalogItems = (
  items: readonly CatalogDocumentItem[],
  sort: DocumentSortMode
): readonly CatalogDocumentItem[] => {
  return [...items].sort((a, b) => {
    switch (sort) {
      case 'doc_date_desc': {
        const da = a.docDate ?? a.createdAt;
        const db = b.docDate ?? b.createdAt;
        return db.localeCompare(da);
      }
      case 'doc_date_asc': {
        const da = a.docDate ?? a.createdAt;
        const db = b.docDate ?? b.createdAt;
        return da.localeCompare(db);
      }
      case 'created_at_desc':
        return b.createdAt.localeCompare(a.createdAt);
      case 'created_at_asc':
        return a.createdAt.localeCompare(b.createdAt);
      case 'relevance':
      default:
        return 0;
    }
  });
};

export const useDocumentsCatalog = (
  initialCatalog: readonly CatalogDocumentItem[] = MOCK_CATALOG_DOCUMENTS,
  initialReviewQueue: readonly CatalogDocumentItem[] = MOCK_REVIEW_QUEUE_DOCUMENTS,
  isDemo = false
) => {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState<DocumentTopic | ''>('');
  const [sortBy, setSortBy] = useState<DocumentSortMode>('doc_date_desc');
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim();
      setDebouncedQuery((prev) => (prev === next ? prev : next));
      if (next !== debouncedQuery) {
        setSelectedIds([]);
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [debouncedQuery, searchInput]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    setSelectedIds([]);
  }, []);

  const handleTopicChange = useCallback((topic: DocumentTopic | '') => {
    setTopicFilter(topic);
    setSelectedIds([]);
  }, []);

  const handleSortChange = useCallback((sort: DocumentSortMode) => {
    setSortBy(sort);
    setSelectedIds([]);
  }, []);

  const catalogQuery = useInfiniteQuery({
    queryKey: DOCUMENTS_QUERY_KEYS.catalog(debouncedQuery, topicFilter, sortBy, isDemo),
    initialPageParam: 0,
    staleTime: 30_000,
    queryFn: async ({ pageParam = 0 }) => {
      if (isDemo) {
        const q = debouncedQuery.toLowerCase();
        const filtered = initialCatalog.filter((doc) => {
          if (topicFilter && doc.topic !== topicFilter) return false;
          if (!q) return true;
          return (
            doc.title.toLowerCase().includes(q) ||
            doc.sender.toLowerCase().includes(q) ||
            doc.summaryText.toLowerCase().includes(q)
          );
        });
        return sortCatalogItems(filtered, sortBy).slice(
          pageParam,
          pageParam + CLASSIC_SEARCH_PAGE_SIZE
        );
      }

      const res = await searchDocumentsClassicAction({
        query: debouncedQuery,
        topic: topicFilter || undefined,
        sortBy,
        limit: CLASSIC_SEARCH_PAGE_SIZE,
        offset: pageParam,
      });

      if (!res.ok) {
        throw new Error(res.errorMessage);
      }

      return res.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < CLASSIC_SEARCH_PAGE_SIZE) {
        return undefined;
      }
      return allPages.reduce((sum, page) => sum + page.length, 0);
    },
    initialData:
      debouncedQuery === '' && topicFilter === '' && sortBy === 'doc_date_desc'
        ? {
            pages: [initialCatalog],
            pageParams: [0],
          }
        : undefined,
  });

  const catalogItems = useMemo(() => {
    const rawPages = catalogQuery.data?.pages?.flat();
    const source = rawPages !== undefined ? rawPages : initialCatalog;
    if (isDemo) {
      const q = debouncedQuery.toLowerCase();
      const filtered = source.filter((doc) => {
        if (topicFilter && doc.topic !== topicFilter) return false;
        if (!q) return true;
        return (
          doc.title.toLowerCase().includes(q) ||
          doc.sender.toLowerCase().includes(q) ||
          doc.summaryText.toLowerCase().includes(q)
        );
      });
      return sortCatalogItems(filtered, sortBy);
    }
    return source;
  }, [catalogQuery.data?.pages, initialCatalog, debouncedQuery, topicFilter, sortBy, isDemo]);

  const reviewQueueQuery = useQuery({
    queryKey: DOCUMENTS_QUERY_KEYS.reviewQueue(isDemo),
    staleTime: 30_000,
    queryFn: async () => {
      if (isDemo) return initialReviewQueue;
      const res = await fetchReviewQueueAction();
      if (!res.ok) throw new Error(res.errorMessage);
      return res.data;
    },
    initialData: initialReviewQueue,
  });

  const invalidateAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['documents'] });
    await queryClient.invalidateQueries({ queryKey: VAULT_QUERY_KEYS.facts });
  }, [queryClient]);

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

  const bulkExport = useDocumentBulkExport(catalogItems, selectedIds, invalidateAll);

  return {
    searchInput,
    handleSearchChange,
    topicFilter,
    handleTopicChange,
    sortBy,
    handleSortChange,
    selectedIds,
    setSelectedIds,
    catalogItems,
    catalogQuery,
    reviewQueueQuery,
    approveBatchMutation,
    retryOcrMutation,
    updateMetaMutation,
    purgeMutation,
    ...bulkExport,
  };
};
