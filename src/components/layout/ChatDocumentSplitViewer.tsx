'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Sparkles,
  X,
} from 'lucide-react';
import type { MockDocumentAttachment } from './kronosChatMockData';

interface ChatDocumentSplitViewerProps {
  readonly documents: readonly MockDocumentAttachment[];
  readonly selectedDocId: string | null;
  readonly onSelectDoc: (docId: string) => void;
  readonly onClose: () => void;
}

export const ChatDocumentSplitViewer: React.FC<ChatDocumentSplitViewerProps> = ({
  documents,
  selectedDocId,
  onSelectDoc,
  onClose,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeDoc =
    documents.find((d) => d.id === selectedDocId) ?? documents[0] ?? null;

  if (!activeDoc) {
    return null;
  }

  const handleCopyValue = async (key: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      // Do not set copiedKey if writeText fails
    }
  };

  return (
    <aside
      aria-label="Преглед на документ и досие в реално време"
      className="flex h-full flex-col border-l border-teal-950/90 bg-[#070d13]/95 backdrop-blur-2xl"
    >
      {/* Top Split-Viewer Header */}
      <header className="flex items-center justify-between gap-2 border-b border-teal-950/80 bg-[#09121a] px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-teal-500/40 bg-teal-500/15 text-teal-300">
            <FileCheck2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <span className="block truncate text-xs font-bold text-white">
              Досие & Преглед в Реално Време
            </span>
            <span className="block truncate text-[10px] font-mono text-teal-400">
              {documents.length} прикачени / намерени документа в разговора
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Затвори страничния преглед на документи"
          className="cursor-pointer flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-[#0c1620] text-zinc-400 transition-colors hover:border-rose-500/50 hover:bg-rose-500/15 hover:text-rose-300"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      {/* Document Selector Tabs */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-zinc-800/80 bg-[#060b10] px-3 py-2">
        {documents.map((doc) => {
          const isSelected = doc.id === activeDoc.id;
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => onSelectDoc(doc.id)}
              aria-label={`Покажи ${doc.title}`}
              className={`cursor-pointer flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-left text-[11px] font-semibold transition-all ${
                isSelected
                  ? 'border-teal-400/60 bg-teal-500/20 text-teal-200 shadow-sm shadow-teal-500/15'
                  : 'border-zinc-800/90 bg-[#0b131b] text-zinc-400 hover:border-teal-500/35 hover:text-zinc-200'
              }`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-teal-400" aria-hidden="true" />
              <span className="max-w-[170px] truncate">{doc.title}</span>
            </button>
          );
        })}
      </div>

      {/* Live Document Sheet Preview */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="rounded-2xl border border-teal-500/35 bg-linear-to-b from-[#0c1822] to-[#081017] p-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
            <span className="rounded-md border border-teal-500/40 bg-teal-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-teal-300">
              {activeDoc.badge}
            </span>
            <span className="font-mono text-[10px] text-zinc-400">
              Реф. №: {activeDoc.referenceCode}
            </span>
          </div>

          <h2 className="mt-3 text-sm font-black text-white sm:text-base">
            {activeDoc.title}
          </h2>
          <p className="mt-0.5 text-xs font-medium text-teal-300/90">
            {activeDoc.sender}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-zinc-800/90 bg-[#060b10] p-2.5 text-[11px]">
            <div>
              <span className="block text-[10px] text-zinc-500">Дата на документа</span>
              <span className="font-mono font-semibold text-zinc-200">
                {activeDoc.docDate}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-zinc-500">Качен / Формат</span>
              <span className="font-mono font-semibold text-zinc-200">
                {activeDoc.uploadedAt} ({activeDoc.fileSize})
              </span>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-zinc-300">
            {activeDoc.previewSummary}
          </p>
        </div>

        {/* Highlighted OCR / Form Fields Inside the Document */}
        <div className="rounded-2xl border border-zinc-800/90 bg-[#091118] p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-400">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Открити полета и стойности в документа
            </span>
          </div>

          <div className="space-y-2">
            {activeDoc.highlightedFields.map((field, idx) => {
              const copyId = `${activeDoc.id}-f-${idx}`;
              return (
                <div
                  key={copyId}
                  className="flex items-center justify-between gap-2 rounded-xl border border-teal-950/80 bg-[#060b10] px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2
                        className={`h-3.5 w-3.5 shrink-0 ${
                          field.status === 'required' ? 'text-amber-400' : 'text-teal-400'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="text-[11px] text-zinc-400">{field.label}</span>
                    </div>
                    <span className="mt-0.5 block truncate font-mono text-xs font-bold text-white pl-5">
                      {field.value}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyValue(copyId, field.value)}
                    aria-label={`Копирай ${field.label}`}
                    className="cursor-pointer rounded-lg border border-teal-500/30 bg-teal-500/10 p-1.5 text-teal-300 hover:bg-teal-500/25"
                  >
                    {copiedKey === copyId ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Simulated Official Paper / OCR Text Preview */}
        <div className="rounded-2xl border border-zinc-800/90 bg-[#060a0f] p-4 space-y-2 font-mono text-xs text-zinc-300">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Директен OCR Преглед на Страницата
          </span>
          {activeDoc.previewParagraphs.map((line, idx) => (
            <p
              key={`${activeDoc.id}-p-${idx}`}
              className="rounded-lg border border-zinc-900 bg-[#091017] px-3 py-2 text-[11px] leading-relaxed text-zinc-300"
            >
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <footer className="flex items-center justify-between gap-2 border-t border-teal-950/80 bg-[#09121a] px-4 py-3">
        <Link
          href="/documents"
          aria-label="Отвори в Документен Сейф"
          className="inline-flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-500/15 px-3 py-2 text-xs font-bold text-teal-200 hover:bg-teal-500/25"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Отвори в Документен Сейф</span>
        </Link>
        <button
          type="button"
          disabled
          aria-label={`Свалянето на ${activeDoc.title} е налично за реални файлове в Документен Сейф`}
          title="Свалянето е налично за реални файлове в Документен Сейф (демо преглед)"
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#0d1722]/50 px-3 py-2 text-xs font-bold text-zinc-500 cursor-not-allowed opacity-60"
        >
          <Download className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
          <span>Свали оригинал (.PDF)</span>
        </button>
      </footer>
    </aside>
  );
};
