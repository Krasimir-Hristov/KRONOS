'use client';

import React from 'react';
import Image from 'next/image';
import {
  Clock,
  Eye,
  FileUp,
  Sparkles,
  Timer,
  User,
} from 'lucide-react';
import { ChatMessageAttachments } from './ChatMessageAttachments';
import type { MockChatMessage } from './kronosChatMockData';
import { KronosHomeHero } from './KronosHomeHero';

interface ChatMessageStreamProps {
  readonly messages: readonly MockChatMessage[];
  readonly isThinking: boolean;
  readonly thinkingStartedAt: string | null;
  readonly onInspectDocument: (docId: string) => void;
}

export const ChatMessageStream: React.FC<ChatMessageStreamProps> = ({
  messages,
  isThinking,
  thinkingStartedAt,
  onInspectDocument,
}) => {
  if (messages.length === 0 && !isThinking) {
    return <KronosHomeHero isThinking={isThinking} />;
  }

  return (
    <section
      aria-label="Разговор с KRONOS AI"
      className="flex-1 space-y-6 px-3 py-6 sm:px-6"
    >
      {messages.map((msg) => {
        const isUser = msg.role === 'user';
        return (
          <article
            key={msg.id}
            className={`mx-auto flex max-w-3xl flex-col ${
              isUser ? 'items-end' : 'items-start'
            }`}
          >
            {/* Explicit Timestamp Bar Above Every Question & Answer */}
            <div
              className={`mb-1.5 flex flex-wrap items-center gap-2 px-1 text-[11px] font-medium ${
                isUser ? 'text-teal-300/90' : 'text-zinc-400'
              }`}
            >
              {isUser ? (
                <>
                  <span className="inline-flex items-center gap-1 rounded-md border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 font-mono text-[10px] text-teal-300">
                    <Clock className="h-3 w-3 text-teal-400" aria-hidden="true" />
                    Въпрос зададен в {msg.timestamp}
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-zinc-200">
                    <User className="h-3 w-3 text-teal-400" aria-hidden="true" />
                    Вие
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5 font-bold text-teal-300">
                    <Image
                      src="/kronos-logo.png"
                      alt="KRONOS"
                      width={18}
                      height={18}
                      className="rounded-md"
                    />
                    KRONOS AI
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-teal-500/25 bg-[#0d1821] px-2 py-0.5 font-mono text-[10px] text-teal-300">
                    <Clock className="h-3 w-3 text-teal-400" aria-hidden="true" />
                    Отговор в {msg.timestamp}
                  </span>
                  {msg.responseDuration && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                      <Timer className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                      {msg.responseDuration}
                    </span>
                  )}
                </>
              )}
            </div>

            <div
              className={`w-full rounded-2xl border p-4 sm:p-5 backdrop-blur-xl ${
                isUser
                  ? 'max-w-xl border-teal-500/35 bg-linear-to-br from-teal-950/70 via-[#0e2029] to-[#0a141c] text-zinc-100 shadow-lg shadow-teal-950/30'
                  : 'border-zinc-800/90 bg-[#0b1218]/90 text-zinc-200 shadow-xl'
              }`}
            >
              {/* User Uploaded File / Form Card Inside User Bubble */}
              {isUser && msg.userUploadedDoc && (
                <div className="mb-3 flex flex-col justify-between gap-2 rounded-xl border border-teal-400/40 bg-[#071118]/90 p-3 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300">
                      <FileUp className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <span className="block truncate text-xs font-bold text-teal-200">
                        {msg.userUploadedDoc.title}
                      </span>
                      <span className="block text-[10px] text-zinc-400">
                        {msg.userUploadedDoc.sender} ({msg.userUploadedDoc.fileSize})
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isThinking}
                    onClick={() => onInspectDocument(msg.userUploadedDoc!.id)}
                    aria-label={`Прегледай ${msg.userUploadedDoc.title} вдясно`}
                    className="cursor-pointer inline-flex shrink-0 items-center gap-1 rounded-lg border border-teal-400/40 bg-teal-500/20 px-2.5 py-1.5 text-[11px] font-bold text-teal-100 hover:bg-teal-500/30 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Виж формуляра</span>
                  </button>
                </div>
              )}

              <p className="whitespace-pre-line text-xs leading-relaxed sm:text-sm">
                {msg.content}
              </p>

              <ChatMessageAttachments
                facts={msg.facts}
                documents={msg.documents}
                isThinking={isThinking}
                onInspectDocument={onInspectDocument}
              />
            </div>
          </article>
        );
      })}

      {/* Animated Clean Teal/Cyan/Emerald Thinking Indicator */}
      {isThinking && (
        <article
          aria-live="polite"
          className="mx-auto flex max-w-3xl flex-col items-start"
        >
          <div className="mb-1.5 flex items-center gap-2 px-1 text-[11px] font-medium text-teal-300">
            <span className="inline-flex items-center gap-1.5 font-bold">
              <Image
                src="/kronos-logo.png"
                alt="KRONOS"
                width={18}
                height={18}
                className="animate-spin rounded-md"
              />
              KRONOS Neural Core
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-teal-400/40 bg-teal-500/15 px-2 py-0.5 font-mono text-[10px] text-teal-200">
              <Timer className="h-3 w-3 text-teal-300 animate-pulse" aria-hidden="true" />
              Старт в {thinkingStartedAt ?? 'сега'} • Обработка...
            </span>
          </div>

          <div className="animate-thinking-surface w-full rounded-2xl border border-teal-400/60 bg-linear-to-r from-[#091921] via-[#0b2830] to-[#081c24] p-4 shadow-2xl">
            <div className="flex items-center gap-3.5">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-tr from-teal-400 via-cyan-400 to-emerald-400 text-zinc-950 shadow-lg shadow-teal-400/30">
                <Sparkles className="h-5 w-5 animate-pulse" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-white sm:text-sm">
                  KRONOS анализира заявката и сканира невронния сейф...
                </p>
                <p className="text-[11px] text-teal-200/85">
                  Невронните мрежи пулсират активно • Всички бутони са заключени
                </p>
              </div>
            </div>
          </div>
        </article>
      )}
    </section>
  );
};
