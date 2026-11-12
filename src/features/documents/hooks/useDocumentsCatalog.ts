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
  processDocumentOcrAction,
  purgeDocumentsAction,
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
  catalog: (query: string, topic: string, sortBy: DocumentSortMode) =>
    ['documents', 'catalog', query, topic, sortBy] as const,
  reviewQueue: ['documents', 'reviewQueue'] as const,
};

export const useDocumentsCatalog = (
  initialCatalog: readonly CatalogDocumentItem[] = MOCK_CATALOG_DOCUMENTS,
  initialReviewQueue: readonly CatalogDocumentItem[] = MOCK_REVIEW_QUEUE_DOCUMENTS
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
    queryKey: DOCUMENTS_QUERY_KEYS.catalog(debouncedQuery, topicFilter, sortBy),
    initialPageParam: 0,
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async () => {
      const q = debouncedQuery.toLowerCase();
      return initialCatalog.filter((doc) => {
        if (topicFilter && doc.topic !== topicFilter) return false;
        if (!q) return true;
        return (
          doc.title.toLowerCase().includes(q) ||
          doc.sender.toLowerCase().includes(q) ||
          doc.summaryText.toLowerCase().includes(q)
        );
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < CLASSIC_SEARCH_PAGE_SIZE) {
        return undefined;
      }
      return allPages.reduce((sum, page) => sum + page.length, 0);
    },
    initialData: {
      pages: [initialCatalog],
      pageParams: [0],
    },
  });

  const catalogItems = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    return initialCatalog.filter((doc) => {
      if (topicFilter && doc.topic !== topicFilter) return false;
      if (!q) return true;
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.sender.toLowerCase().includes(q) ||
        doc.summaryText.toLowerCase().includes(q)
      );
    });
  }, [initialCatalog, debouncedQuery, topicFilter]);

  const reviewQueueQuery = useQuery({
    queryKey: DOCUMENTS_QUERY_KEYS.reviewQueue,
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async () => initialReviewQueue,
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
