'use client';

import React, { useRef, useState } from 'react';
import { Loader2, Paperclip, Send, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SendMessagePayload } from '../hooks/useAssistantChat';

interface ChatComposerBarProps {
  readonly isSending: boolean;
  readonly uploadStatus: string | null;
  readonly draftPrompt: string;
  readonly onDraftPromptChange: (next: string) => void;
  readonly onSend: (payload: SendMessagePayload) => Promise<void>;
}

export const ChatComposerBar: React.FC<ChatComposerBarProps> = ({
  isSending,
  uploadStatus,
  draftPrompt,
  onDraftPromptChange,
  onSend,
}) => {
  const t = useTranslations('chat');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [saveToVault, setSaveToVault] = useState(false);

  const latestDraftRef = useRef(draftPrompt);
  latestDraftRef.current = draftPrompt;
  const latestFileRef = useRef(attachedFile);
  latestFileRef.current = attachedFile;
  const latestSaveRef = useRef(saveToVault);
  latestSaveRef.current = saveToVault;

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
          const named = new File([blob], `Portal_Screenshot_${stamp}.${ext}`, {
            type: blob.type || 'image/png',
          });
          setAttachedFile(named);
          return;
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = draftPrompt.trim();
    if ((!trimmed && !attachedFile) || isSending) {
      return;
    }

    const prevDraft = draftPrompt;
    const prevFile = attachedFile;
    const prevSaveToVault = saveToVault;

    const payload: SendMessagePayload = {
      message: trimmed,
      file: attachedFile,
      saveToVault,
    };

    onDraftPromptChange('');
    setAttachedFile(null);
    setSaveToVault(false);

    try {
      await onSend(payload);
    } catch {
      if (latestDraftRef.current === '') {
        onDraftPromptChange(prevDraft);
      }
      if (latestFileRef.current === null) {
        setAttachedFile(prevFile);
      }
      if (latestSaveRef.current === false) {
        setSaveToVault(prevSaveToVault);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((draftPrompt.trim() || attachedFile) && !isSending) {
        void handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
      }
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-3xl border border-zinc-800/90 bg-zinc-950/90 p-3 sm:p-4 shadow-2xl backdrop-blur-2xl space-y-2.5"
    >
      {attachedFile && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Paperclip className="h-3.5 w-3.5 shrink-0 text-cyan-400" aria-hidden="true" />
            <span className="font-mono font-semibold text-white truncate">
              {attachedFile.name}
            </span>
            <span className="text-[11px] font-mono text-zinc-400 shrink-0">
              ({(attachedFile.size / (1024 * 1024)).toFixed(2)} MB)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium text-cyan-200">
              <input
                type="checkbox"
                checked={saveToVault}
                onChange={(e) => setSaveToVault(e.target.checked)}
                aria-label={t('saveToVaultToggle')}
                className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-cyan-500"
              />
              <span>{t('saveToVaultToggle')}</span>
            </label>
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
          accept="application/pdf,image/jpeg,image/png,image/webp"
          aria-label={t('attachFile')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            if (file) {
              setAttachedFile(file);
            }
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

        <textarea
          rows={2}
          disabled={isSending}
          value={draftPrompt}
          onChange={(e) => onDraftPromptChange(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
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
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">{t('sendButton')}</span>
        </button>
      </div>

      <p className="px-1 text-[11px] font-mono text-zinc-500">{t('pasteHint')}</p>
    </form>
  );
};
