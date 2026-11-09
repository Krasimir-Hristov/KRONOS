'use client';

import React, { useRef, useState } from 'react';
import { Camera, Loader2, Paperclip, Send, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  ALLOWED_MIME_TYPES,
  FILE_INPUT_ACCEPT_STRING,
  MAX_FILE_SIZE_BYTES,
  resolveCanonicalMimeType,
} from '@/features/storage';
import { useIsMobileCameraDevice } from '@/lib/ui/useIsMobileCameraDevice';
import type { SendMessagePayload } from '../hooks/useAssistantChat';
import { SAVE_TO_RAG_REGEX } from '../schemas/assistantSchema';
import { VoiceModeControls } from './VoiceModeControls';

interface ChatComposerBarProps {
  readonly isSending: boolean;
  readonly uploadStatus: string | null;
  readonly draftPrompt: string;
  readonly latestAssistantReply: { readonly id: string; readonly text: string } | null;
  readonly onDraftPromptChange: (next: string) => void;
  readonly onSend: (payload: SendMessagePayload) => Promise<void>;
}

export const ChatComposerBar: React.FC<ChatComposerBarProps> = ({
  isSending,
  uploadStatus,
  draftPrompt,
  latestAssistantReply,
  onDraftPromptChange,
  onSend,
}) => {
  const t = useTranslations('chat');
  const isMobileCamera = useIsMobileCameraDevice();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const latestDraftRef = useRef(draftPrompt);
  latestDraftRef.current = draftPrompt;
  const latestFileRef = useRef(attachedFile);
  latestFileRef.current = attachedFile;

  const tryAttachFile = (file: File | null) => {
    if (!file) return;
    if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
      setFileError('Файлът трябва да е между 1 байт и 50 MB.');
      return;
    }
    const canonicalMime = resolveCanonicalMimeType(file.name, file.type);
    if (!canonicalMime || !(ALLOWED_MIME_TYPES as readonly string[]).includes(canonicalMime)) {
      setFileError(
        'Неподдържан формат. Разрешени са PDF, изображения, Word, Excel, HTML, CSV, TXT, MD, JSON и XML.'
      );
      return;
    }
    setFileError(null);
    setAttachedFile(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item && item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          const ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png';
          const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
          tryAttachFile(new File([blob], `Portal_Screenshot_${stamp}.${ext}`, { type: blob.type || 'image/png' }));
          return;
        }
      }
    }
  };

  const dispatchMessage = async (
    messageText: string,
    fileToAttach: File | null,
    options?: { readonly isHandsFree?: boolean }
  ) => {
    const trimmed = messageText.trim();
    if ((!trimmed && !fileToAttach) || isSending) return;

    const isHandsFree = options?.isHandsFree === true;
    const prevDraft = latestDraftRef.current;
    const prevFile = latestFileRef.current;
    const saveToVault = fileToAttach !== null && SAVE_TO_RAG_REGEX.test(trimmed);

    if (!isHandsFree) onDraftPromptChange('');
    if (fileToAttach !== null) {
      setAttachedFile(null);
      setFileError(null);
    }

    try {
      await onSend({ message: trimmed, file: fileToAttach, saveToVault });
    } catch {
      if (!isHandsFree && latestDraftRef.current === '') onDraftPromptChange(prevDraft);
      if (fileToAttach !== null && latestFileRef.current === null) setAttachedFile(prevFile);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void dispatchMessage(draftPrompt, attachedFile);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        tryAttachFile(e.dataTransfer.files?.[0] ?? null);
      }}
      className={`rounded-3xl border p-3 sm:p-4 shadow-2xl backdrop-blur-2xl space-y-2.5 transition-all ${
        isDragging ? 'border-cyan-400 bg-cyan-500/10' : 'border-zinc-800/90 bg-zinc-950/90'
      }`}
    >
      <VoiceModeControls
        isSending={isSending}
        latestAssistantReply={latestAssistantReply}
        onAppendDictatedText={(spokenText) => {
          onDraftPromptChange(
            latestDraftRef.current ? `${latestDraftRef.current.trim()} ${spokenText}` : spokenText
          );
        }}
        onHandsFreeSend={async (spokenText) => {
          await dispatchMessage(spokenText, latestFileRef.current, { isHandsFree: true });
        }}
      />

      {fileError && (
        <p role="alert" className="px-1 text-xs font-medium text-rose-400">{fileError}</p>
      )}

      {attachedFile && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Paperclip className="h-3.5 w-3.5 shrink-0 text-cyan-400" aria-hidden="true" />
            <span className="font-mono font-semibold text-white truncate">{attachedFile.name}</span>
            <span className="text-[11px] font-mono text-zinc-400 shrink-0">
              ({(attachedFile.size / (1024 * 1024)).toFixed(2)} MB)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-cyan-200">
              Кажете или напишете „Запази го“, за да влезе в RAG сейфа
            </span>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              aria-label="Премахни прикачения файл"
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {uploadStatus && (
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 px-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          <span>{uploadStatus}</span>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={FILE_INPUT_ACCEPT_STRING}
          aria-label={t('attachFile')}
          className="hidden"
          onChange={(e) => {
            tryAttachFile(e.target.files?.[0] ?? null);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={isSending}
          onClick={() => fileInputRef.current?.click()}
          aria-label={t('attachFile')}
          className="shrink-0 flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-500/40 hover:text-cyan-400 disabled:opacity-40 transition-all"
        >
          <Paperclip className="h-4 w-4" aria-hidden="true" />
        </button>

        {isMobileCamera && (
          <>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              aria-label="Снимай документ с камерата"
              className="hidden"
              onChange={(e) => {
                tryAttachFile(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={isSending}
              onClick={() => cameraInputRef.current?.click()}
              aria-label="Снимай документ директно с камерата"
              className="shrink-0 flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-cyan-400 hover:border-cyan-500/40 disabled:opacity-40 transition-all"
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}

        <textarea
          rows={2}
          disabled={isSending}
          value={draftPrompt}
          onChange={(e) => onDraftPromptChange(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if ((draftPrompt.trim() || attachedFile) && !isSending) {
                void dispatchMessage(draftPrompt, attachedFile);
              }
            }
          }}
          aria-label={t('inputPlaceholder')}
          placeholder={t('inputPlaceholder')}
          className="flex-1 resize-none rounded-2xl border border-zinc-800 bg-zinc-900/90 px-4 py-2.5 text-base md:text-sm text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none"
        />

        <button
          type="submit"
          disabled={isSending || (!draftPrompt.trim() && !attachedFile)}
          aria-label={t('sendButton')}
          className="shrink-0 inline-flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-cyan-500 via-indigo-600 to-violet-600 px-4 sm:px-5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all"
        >
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          <span className="hidden sm:inline">{t('sendButton')}</span>
        </button>
      </div>

      <p className="px-1 text-[11px] font-mono text-zinc-500">{t('pasteHint')}</p>
    </form>
  );
};
