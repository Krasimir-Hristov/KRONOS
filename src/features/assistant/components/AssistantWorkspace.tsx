'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQueryClient } from '@tanstack/react-query';
import { Bot, FileSearch, Landmark, Loader2, ShieldKeyhole, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  updateDocumentMetaAction,
  type CatalogDocumentItem,
  type UpdateDocumentMetaInput,
} from '@/features/documents';
import { ASSISTANT_QUERY_KEYS, useAssistantChat } from '../hooks/useAssistantChat';
import type { AssistantWorkspaceSnapshot } from '../schemas/assistantViewTypes';
import { AssistantSidebar } from './AssistantSidebar';
import { ChatComposerBar } from './ChatComposerBar';
import { ChatMessageBubble } from './ChatMessageBubble';

const DynamicDocumentPreviewModal = dynamic(
  () => import('@/features/documents').then((m) => m.DocumentPreviewModal),
  { ssr: false }
);

interface AssistantWorkspaceProps {
  readonly initialSnapshot?: AssistantWorkspaceSnapshot;
  readonly initialLoadError?: string | null;
}

const STARTER_CARDS = [
  {
    icon: FileSearch,
    title: 'Двузоново търсене с Jev',
    prompt: 'Дойде ми скоро нещо за Kinderzuschlag — намери ми документа.',
    badge: 'ЗОНА 1 + 2',
  },
  {
    icon: Landmark,
    title: 'Пакет за Wohngeld / KiZ портал',
    prompt:
      'Трябват ми Kontoauszüge за последните 6 месеца и личните ми данни за онлайн молба за Wohngeld.',
    badge: 'ОТДЕЛНИ / .ZIP',
  },
  {
    icon: Bot,
    title: 'Официален отговор / Widerspruch',
    prompt:
      'Напиши официален отговор на немски (Widerspruch) до Familienkasse относно решение за Kinderzuschlag.',
    badge: 'DE + BG',
  },
  {
    icon: ShieldKeyhole,
    title: 'Моите Steuer-ID, IBAN и Наем',
    prompt: 'Покажи ми моите Steuer-ID, IBAN, Kindergeldnummer и Kaltmiete за копиране.',
    badge: '1-КЛИК КОПИРАНЕ',
  },
] as const;

export const AssistantWorkspace: React.FC<AssistantWorkspaceProps> = ({
  initialSnapshot,
  initialLoadError = null,
}) => {
  const t = useTranslations('chat');
  const queryClient = useQueryClient();
  const chat = useAssistantChat(initialSnapshot);
  const [draftPrompt, setDraftPrompt] = useState('');
  const [previewDoc, setPreviewDoc] = useState<CatalogDocumentItem | null>(null);
  const [isSavingDocMeta, setIsSavingDocMeta] = useState(false);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chat.messages.length, chat.sendMessageMutation.isPending]);

  const activeError =
    chat.errorBanner ?? (chat.isWorkspaceLoaded ? null : initialLoadError);

  const refreshAssistantAndDocs = async () => {
    await queryClient.invalidateQueries({ queryKey: ['documents'] });
    await queryClient.invalidateQueries({
      queryKey: ASSISTANT_QUERY_KEYS.workspace(chat.activeSessionId),
    });
  };

  const handleSaveDocMeta = async (input: UpdateDocumentMetaInput) => {
    setIsSavingDocMeta(true);
    try {
      const res = await updateDocumentMetaAction(input);
      if (!res.ok) {
        throw new Error(res.errorMessage);
      }
      await refreshAssistantAndDocs();
    } finally {
      setIsSavingDocMeta(false);
    }
  };

  const handleDeleteSession = (sessionId: string, title: string) => {
    if (!window.confirm(`Да се изтрие ли разговорът „${title}“?`)) {
      return;
    }
    void chat.deleteSessionMutation.mutateAsync(sessionId);
  };

  return (
    <section aria-label={t('title')} className="space-y-6">
      <div inert={Boolean(previewDoc)} className="space-y-6">
        <header className="relative rounded-3xl border border-zinc-800/80 bg-zinc-950/75 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -left-24 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-52 w-52 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-400">
                  {t('stageBadge')}
                </span>
                <span className="text-xs font-mono text-zinc-500">• {t('stageRole')}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                <span>{t('title')}</span>
                <Sparkles className="h-5 w-5 text-cyan-400 motion-safe:animate-pulse" aria-hidden="true" />
              </h1>
              <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-zinc-400 leading-relaxed">
                {t('subtitle')}
              </p>
            </div>
          </div>
        </header>

        {activeError && (
          <p
            role="alert"
            className="rounded-2xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-200"
          >
            {activeError}
          </p>
        )}

        <div className="flex flex-col xl:flex-row gap-5 items-start">
          <AssistantSidebar
            sessions={chat.sessions}
            activeSessionId={chat.activeSessionId}
            isBusy={
              chat.sendMessageMutation.isPending ||
              chat.createSessionMutation.isPending ||
              chat.deleteSessionMutation.isPending
            }
            onSelectSession={(id) => chat.selectSession(id)}
            onCreateSession={() => void chat.createSessionMutation.mutateAsync()}
            onDeleteSession={handleDeleteSession}
          />

          <div className="flex-1 w-full min-w-0 space-y-4">
            {chat.messages.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STARTER_CARDS.map((card) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.title}
                      type="button"
                      onClick={() => setDraftPrompt(card.prompt)}
                      aria-label={`Избери пример: ${card.title}`}
                      className="text-left rounded-2xl border border-zinc-800/90 bg-zinc-950/75 p-4 hover:border-cyan-500/40 hover:bg-zinc-900/80 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 group-hover:scale-105 transition-transform">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="rounded-md bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-400">
                          {card.badge}
                        </span>
                      </div>
                      <h2 className="text-xs sm:text-sm font-bold text-white">{card.title}</h2>
                      <p className="mt-1 text-xs text-zinc-400 leading-relaxed line-clamp-2">
                        „{card.prompt}“
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4 max-h-[62vh] overflow-y-auto pr-1">
                {chat.messages.map((msg) => (
                  <ChatMessageBubble
                    key={msg.id}
                    item={msg}
                    isConfirmingDelete={chat.confirmDeleteMutation.isPending}
                    onPreviewDoc={(doc) => setPreviewDoc(doc)}
                    onVaultSaved={refreshAssistantAndDocs}
                    onConfirmDelete={async (input) => {
                      await chat.confirmDeleteMutation.mutateAsync(input);
                    }}
                  />
                ))}

                {chat.sendMessageMutation.isPending && (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-cyan-500/25 bg-zinc-950/80 px-4 py-3 text-xs font-mono text-cyan-300">
                    <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                    <span>LangGraph Supervisor & субагентите анализират заявката...</span>
                  </div>
                )}

                <div ref={bottomAnchorRef} />
              </div>
            )}

            <ChatComposerBar
              isSending={chat.sendMessageMutation.isPending}
              uploadStatus={chat.uploadStatus}
              draftPrompt={draftPrompt}
              onDraftPromptChange={setDraftPrompt}
              onSend={async (payload) => {
                await chat.sendMessageMutation.mutateAsync(payload);
              }}
            />
          </div>
        </div>
      </div>

      {previewDoc && (
        <DynamicDocumentPreviewModal
          doc={previewDoc}
          isSaving={isSavingDocMeta}
          onClose={() => setPreviewDoc(null)}
          onSaveMeta={handleSaveDocMeta}
        />
      )}
    </section>
  );
};
