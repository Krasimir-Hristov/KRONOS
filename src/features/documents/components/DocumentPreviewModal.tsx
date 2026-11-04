'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader2, Save, X } from 'lucide-react';
import { getDocumentSignedUrlAction } from '../dal/documentActions';
import {
  DOCUMENT_TOPIC_LABELS_BG,
  DOCUMENT_TOPICS,
  DOCUMENT_TYPE_LABELS_BG,
  DOCUMENT_TYPES,
  type CatalogDocumentItem,
  type DocumentTopic,
  type DocumentType,
  type UpdateDocumentMetaInput,
} from '../schemas/documentSchema';

interface DocumentPreviewModalProps {
  readonly doc: CatalogDocumentItem;
  readonly isSaving: boolean;
  readonly onClose: () => void;
  readonly onSaveMeta: (input: UpdateDocumentMetaInput) => Promise<void>;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  doc,
  isSaving,
  onClose,
  onSaveMeta,
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [title, setTitle] = useState(doc.title);
  const [topic, setTopic] = useState<DocumentTopic>(doc.topic);
  const [docType, setDocType] = useState<DocumentType>(doc.docType);
  const [sender, setSender] = useState(doc.sender);
  const [docDate, setDocDate] = useState(doc.docDate ?? '');
  const [expiresAt, setExpiresAt] = useState(doc.expiresAt ?? '');

  useEffect(() => {
    let active = true;
    const loadUrl = async () => {
      const res = await getDocumentSignedUrlAction({ storagePath: doc.storagePath });
      if (!active) return;
      if (res.ok) {
        setSignedUrl(res.data.signedUrl);
      } else {
        setUrlError(res.errorMessage);
      }
    };
    void loadUrl();
    return () => {
      active = false;
    };
  }, [doc.storagePath]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSaveMeta({
      id: doc.id,
      title: title.trim() || doc.title,
      topic,
      docType,
      sender: sender.trim(),
      docDate: docDate.trim() || null,
      expiresAt: expiresAt.trim() || null,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Преглед на документ ${doc.title}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/85 backdrop-blur-md p-3 sm:p-6"
    >
      <article className="flex flex-col lg:flex-row w-full max-w-6xl h-[90vh] overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="flex-1 bg-zinc-900/60 flex items-center justify-center overflow-auto p-3 border-b lg:border-b-0 lg:border-r border-zinc-800">
          {!signedUrl && !urlError && (
            <div className="flex items-center gap-2 text-sm font-mono text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-400" aria-hidden="true" />
              <span>Зареждане на защитен преглед...</span>
            </div>
          )}
          {urlError && <p className="text-sm text-rose-400">{urlError}</p>}
          {signedUrl && doc.mimeType === 'application/pdf' && (
            <iframe
              src={signedUrl}
              title={doc.title}
              className="h-full w-full rounded-xl bg-white"
            />
          )}
          {signedUrl && doc.mimeType !== 'application/pdf' && (
            <Image
              src={signedUrl}
              alt={doc.title}
              width={1200}
              height={1600}
              unoptimized
              className="max-h-full w-auto object-contain rounded-xl"
            />
          )}
        </div>

        <form
          onSubmit={(e) => void handleSave(e)}
          className="w-full lg:w-96 shrink-0 p-5 overflow-y-auto space-y-4 bg-zinc-950"
        >
          <header className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-white tracking-wide">Детайли & Редакция</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Затвори прегледа"
              className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">Заглавие</label>
            <input
              type="text"
              required
              aria-label="Заглавие на документа"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Тема</label>
              <select
                aria-label="Тема на документа"
                value={topic}
                onChange={(e) => setTopic(e.target.value as DocumentTopic)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                {DOCUMENT_TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {DOCUMENT_TOPIC_LABELS_BG[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Вид</label>
              <select
                aria-label="Вид на документа"
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {DOCUMENT_TYPE_LABELS_BG[dt]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">Подател</label>
            <input
              type="text"
              aria-label="Подател на документа"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Дата</label>
              <input
                type="date"
                aria-label="Дата от документа"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Краен срок</label>
              <input
                type="date"
                aria-label="Краен срок по документа"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {doc.summaryText && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
              <span className="block text-[11px] font-mono font-semibold text-cyan-300 mb-1">
                OCR Резюме:
              </span>
              <p className="text-xs text-zinc-300 leading-relaxed">{doc.summaryText}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            aria-label="Запази промените по документа"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-500 via-indigo-600 to-violet-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            <span>{isSaving ? 'Записване...' : 'Запази промените'}</span>
          </button>
        </form>
      </article>
    </div>
  );
};
