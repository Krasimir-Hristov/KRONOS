'use client';

import React, { useState } from 'react';
import { CheckCheck, Sparkles } from 'lucide-react';
import type {
  ApproveDocumentItemInput,
  CatalogDocumentItem,
} from '../schemas/documentSchema';
import { UploadReviewRow, type ReviewDraftState } from './UploadReviewRow';

interface UploadReviewQueueProps {
  readonly items: readonly CatalogDocumentItem[];
  readonly isApproving: boolean;
  readonly isRetryingOcr: boolean;
  readonly onApproveBatch: (payload: readonly ApproveDocumentItemInput[]) => Promise<void>;
  readonly onRetryOcr: (documentId: string) => Promise<void>;
  readonly onPreview: (doc: CatalogDocumentItem) => void;
  readonly onDelete: (documentId: string) => Promise<void>;
}

const createInitialDraft = (doc: CatalogDocumentItem): ReviewDraftState => ({
  title: doc.title,
  topic: doc.topic,
  docType: doc.docType,
  sender: doc.sender,
  docDate: doc.docDate ?? '',
  expiresAt: doc.expiresAt ?? '',
  selectedFactIndices: doc.reviewMeta.suggestedFacts.map((_, idx) => idx),
});

export const UploadReviewQueue: React.FC<UploadReviewQueueProps> = ({
  items,
  isApproving,
  isRetryingOcr,
  onApproveBatch,
  onRetryOcr,
  onPreview,
  onDelete,
}) => {
  const [overrides, setOverrides] = useState<Record<string, ReviewDraftState>>({});

  if (items.length === 0) {
    return null;
  }

  const getDraft = (doc: CatalogDocumentItem): ReviewDraftState => {
    return overrides[doc.id] ?? createInitialDraft(doc);
  };

  const toApproveInput = (doc: CatalogDocumentItem): ApproveDocumentItemInput => {
    const draft = getDraft(doc);
    const selectedFacts = doc.reviewMeta.suggestedFacts.filter((_, idx) =>
      draft.selectedFactIndices.includes(idx)
    );
    return {
      id: doc.id,
      title: draft.title.trim() || doc.title,
      topic: draft.topic,
      docType: draft.docType,
      sender: draft.sender.trim(),
      docDate: draft.docDate.trim() || null,
      expiresAt: draft.expiresAt.trim() || null,
      selectedFacts,
    };
  };

  const handleApproveAll = async () => {
    const batch = items.map(toApproveInput);
    await onApproveBatch(batch);
  };

  return (
    <section
      aria-label="Списък за преглед и одобрение след качване"
      className="rounded-3xl border border-cyan-500/30 bg-linear-to-b from-cyan-950/20 via-zinc-950/90 to-zinc-950 p-5 sm:p-6 space-y-4 shadow-2xl backdrop-blur-xl"
    >
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Чакащи преглед и одобрение ({items.length})
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            AI извлече тези метаданни и факти. Проверете ги или натиснете „Одобри всички“.
          </p>
        </div>

        <button
          type="button"
          disabled={isApproving}
          onClick={() => void handleApproveAll()}
          aria-label="Одобри всички чакащи документи наведнъж"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-500 via-teal-600 to-cyan-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
        >
          <CheckCheck className="h-4 w-4" aria-hidden="true" />
          <span>{isApproving ? 'Одобряване...' : `✅ Одобри всички (${items.length})`}</span>
        </button>
      </header>

      <div className="space-y-3">
        {items.map((doc) => (
          <UploadReviewRow
            key={doc.id}
            doc={doc}
            draft={getDraft(doc)}
            isBusy={isApproving || isRetryingOcr}
            onChangeDraft={(next) =>
              setOverrides((prev) => ({ ...prev, [doc.id]: next }))
            }
            onApproveSingle={() => void onApproveBatch([toApproveInput(doc)])}
            onRetryOcr={() => void onRetryOcr(doc.id)}
            onPreview={() => onPreview(doc)}
            onDelete={() => void onDelete(doc.id)}
          />
        ))}
      </div>
    </section>
  );
};
