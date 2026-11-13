'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('chat');

  return (
    <footer className="sticky bottom-0 z-20 bg-linear-to-t from-[#060a0e] via-[#060a0e]/95 to-transparent px-3 pb-3.5 pt-2 sm:px-6 sm:pb-4.5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!promptText.trim() || isThinking) return;
          onSubmit();
        }}
        aria-label={t('composerFormAria')}
        className={`mx-auto max-w-3xl rounded-3xl border bg-[#0b131a]/95 p-2 shadow-2xl backdrop-blur-2xl transition-all duration-300 ${
          isThinking
            ? 'border-teal-400/60 shadow-teal-500/15'
            : 'border-teal-950/90 hover:border-teal-500/40 focus-within:border-teal-400/60'
        }`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Attachment button (Demo indicator) */}
          <button
            type="button"
            disabled
            aria-label={t('attachDemoAria')}
            title={t('attachDemoTitle')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800/60 bg-[#080e14]/50 text-zinc-600 cursor-not-allowed opacity-60"
          >
            <Paperclip className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Input text field (16px text-base on mobile to avoid zoom) */}
          <input
            type="text"
            value={promptText}
            disabled={isThinking}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder={
              isThinking
                ? t('thinkingPlaceholder')
                : t('idlePlaceholder')
            }
            aria-label={t('inputAria')}
            className="w-full min-w-0 bg-transparent px-2 py-1.5 text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          />

          {/* Dictation / Microphone button (Demo indicator) */}
          <button
            type="button"
            disabled
            aria-label={t('dictationDemoAria')}
            title={t('dictationDemoTitle')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800/60 bg-[#080e14]/50 text-zinc-600 cursor-not-allowed opacity-60"
          >
            <Mic className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Live Voice Conversation button (Demo indicator) */}
          <button
            type="button"
            disabled
            aria-label={t('voiceLiveDemoAria')}
            title={t('voiceLiveDemoTitle')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-950/60 bg-teal-950/20 text-teal-800 cursor-not-allowed opacity-60"
          >
            <AudioLines className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Compact Send button */}
          <button
            type="submit"
            disabled={isThinking || promptText.trim().length === 0}
            aria-label={t('sendAria')}
            title={t('sendTitle')}
            className="cursor-pointer flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-r from-teal-500 to-emerald-500 text-zinc-950 shadow-md shadow-teal-500/25 transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/70 px-2 pt-1.5 text-[10px] text-zinc-400">
          <span className="inline-flex items-center gap-1 text-teal-300 font-semibold">
            <Sparkles className="h-3 w-3 text-teal-400" aria-hidden="true" />
            {t('footerDisclaimer')}
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-emerald-400">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            {t('footerNeuralBadge')}
          </span>
        </div>
      </form>
    </footer>
  );
};
