'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  Eye,
  FileText,
  Sparkles,
} from 'lucide-react';
import type {
  MockDocumentAttachment,
  MockExtractedFact,
} from './kronosChatMockData';

interface ChatMessageAttachmentsProps {
  readonly facts?: readonly MockExtractedFact[];
  readonly documents?: readonly MockDocumentAttachment[];
  readonly isThinking: boolean;
  readonly onInspectDocument: (docId: string) => void;
}

export const ChatMessageAttachments: React.FC<ChatMessageAttachmentsProps> = ({
  facts,
  documents,
  isThinking,
  onInspectDocument,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyFact = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Do not show confirmation if writeText fails
    }
  };

  const topMatchDoc = documents?.find((d) => d.zone === 'zone1') ?? documents?.[0];
  const otherDocs = documents?.filter((d) => d.id !== topMatchDoc?.id) ?? [];

  return (
    <>
      {facts && facts.length > 0 && (
        <div className="mt-3.5 space-y-2 border-t border-zinc-800/80 pt-3">
          <span className="block text-[10px] font-bold tracking-wider uppercase text-teal-400">
            Извлечени лични данни (1-клик копиране)
          </span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {facts.map((fact) => (
              <div
                key={fact.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-teal-950/80 bg-[#080e14] px-3 py-1.5"
              >
                <div className="min-w-0">
                  <span className="block text-[10px] text-zinc-400">
                    {fact.label}
                  </span>
                  <span className="block truncate font-mono text-xs font-bold text-teal-200">
                    {fact.value}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isThinking}
                  onClick={() => handleCopyFact(fact.id, fact.value)}
                  aria-label={`Копирай ${fact.label}`}
                  className="cursor-pointer rounded-lg border border-teal-500/30 bg-teal-500/10 p-1.5 text-teal-300 transition-colors hover:bg-teal-500/25 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {copiedId === fact.id ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {topMatchDoc && (
        <div className="mt-3.5 space-y-2 border-t border-zinc-800/80 pt-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-teal-400">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Основно попадение (Зона 1)
            </span>
            <span className="text-[10px] text-zinc-500">Кликнете за преглед в досието</span>
          </div>

          <div className="flex flex-col justify-between gap-2 rounded-xl border border-teal-500/40 bg-teal-950/20 p-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-2.5 min-w-0">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" aria-hidden="true" />
              <div className="min-w-0">
                <span className="block truncate text-xs font-bold text-white">
                  {topMatchDoc.title}
                </span>
                <p className="mt-0.5 text-[11px] text-zinc-400">
                  {topMatchDoc.sender} • Дата: {topMatchDoc.docDate} ({topMatchDoc.fileSize})
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isThinking}
              onClick={() => onInspectDocument(topMatchDoc.id)}
              aria-label={`Прегледай ${topMatchDoc.title} в досието`}
              className="cursor-pointer inline-flex shrink-0 items-center gap-1 rounded-lg border border-teal-400/40 bg-teal-500/20 px-2.5 py-1.5 text-[11px] font-bold text-teal-100 hover:bg-teal-500/30 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Eye className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
              <span>Отвори в досието</span>
            </button>
          </div>

          {otherDocs.length > 0 && (
            <div className="pt-1.5">
              <span className="block text-[10px] font-semibold text-zinc-400 mb-1.5">
                Свързани документи (Зона 2):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {otherDocs.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    disabled={isThinking}
                    onClick={() => onInspectDocument(doc.id)}
                    aria-label={`Отвори ${doc.title} в досието`}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#070c11] px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:border-teal-500/40 hover:text-teal-200 transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <FileText className="h-3 w-3 text-teal-400/80" aria-hidden="true" />
                    <span className="max-w-[210px] truncate">{doc.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
