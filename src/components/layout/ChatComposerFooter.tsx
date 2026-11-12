'use client';

import React from 'react';
import {
  AudioLines,
  Mic,
  Paperclip,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface ChatComposerFooterProps {
  readonly promptText: string;
  readonly isThinking: boolean;
  readonly onPromptChange: (value: string) => void;
  readonly onSubmit: () => void;
}

export const ChatComposerFooter: React.FC<ChatComposerFooterProps> = ({
  promptText,
  isThinking,
  onPromptChange,
  onSubmit,
}) => {
  return (
    <footer className="sticky bottom-0 z-20 bg-linear-to-t from-[#060a0e] via-[#060a0e]/95 to-transparent px-3 pb-3.5 pt-2 sm:px-6 sm:pb-4.5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!promptText.trim() || isThinking) return;
          onSubmit();
        }}
        aria-label="Поле за въпрос към KRONOS AI"
        className={`mx-auto max-w-3xl rounded-3xl border bg-[#0b131a]/95 p-2 shadow-2xl backdrop-blur-2xl transition-all duration-300 ${
          isThinking
            ? 'border-teal-400/60 shadow-teal-500/15'
            : 'border-teal-950/90 hover:border-teal-500/40 focus-within:border-teal-400/60'
        }`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Attachment button */}
          <button
            type="button"
            disabled={isThinking}
            aria-label="Прикачи PDF или снимка (Ctrl+V)"
            title="Прикачи документ (PDF или снимка)"
            className="cursor-pointer flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-[#080e14] text-zinc-400 transition-colors hover:border-teal-500/40 hover:text-teal-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Paperclip className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Input text field */}
          <input
            type="text"
            value={promptText}
            disabled={isThinking}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder={
              isThinking
                ? 'KRONOS мисли в момента — изчакайте завършване на анализа...'
                : 'Задайте въпрос, поставете скрийншот (Ctrl+V) или качете формуляр...'
            }
            aria-label="Текст на въпроса"
            className="w-full min-w-0 bg-transparent px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          />

          {/* Dictation / Microphone button */}
          <button
            type="button"
            disabled={isThinking}
            aria-label="Гласово въвеждане (Диктуване)"
            title="Диктуване с глас"
            className="cursor-pointer flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-[#080e14] text-zinc-400 transition-colors hover:border-teal-500/40 hover:text-teal-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Mic className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Live Voice Conversation button */}
          <button
            type="button"
            disabled={isThinking}
            aria-label="Гласов разговор на живо"
            title="Разговор на живо с KRONOS"
            className="cursor-pointer flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-500/35 bg-teal-500/10 text-teal-300 transition-colors hover:border-teal-400 hover:bg-teal-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <AudioLines className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Compact Send button */}
          <button
            type="submit"
            disabled={isThinking || promptText.trim().length === 0}
            aria-label="Изпрати въпроса"
            title="Изпрати"
            className="cursor-pointer flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-r from-teal-500 to-emerald-500 text-zinc-950 shadow-md shadow-teal-500/25 transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/70 px-2 pt-1.5 text-[10px] text-zinc-400">
          <span className="inline-flex items-center gap-1 text-teal-300 font-semibold">
            <Sparkles className="h-3 w-3 text-teal-400" aria-hidden="true" />
            Диктуване • Разговор на живо • Чат с писане
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-emerald-400">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            AES-256 & 4-ПИН
          </span>
        </div>
      </form>
    </footer>
  );
};
