'use client';

import React from 'react';
import { Headphones, Keyboard, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useBrowserVoiceSession } from '../hooks/useBrowserVoiceSession';

interface VoiceModeControlsProps {
  readonly isSending: boolean;
  readonly latestAssistantReply: {
    readonly id: string;
    readonly text: string;
  } | null;
  readonly onAppendDictatedText: (text: string) => void;
  readonly onHandsFreeSend: (text: string) => Promise<void>;
}

export const VoiceModeControls: React.FC<VoiceModeControlsProps> = ({
  isSending,
  latestAssistantReply,
  onAppendDictatedText,
  onHandsFreeSend,
}) => {
  const voice = useBrowserVoiceSession({
    latestAssistantReply,
    onAppendDictatedText,
    onHandsFreeSend,
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
      <div
        role="group"
        aria-label="Режим на общуване с KRONOS"
        className="inline-flex flex-wrap items-center gap-1 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-1"
      >
        <button
          type="button"
          onClick={() => voice.selectMode('text')}
          aria-label="Режим писане с клавиатура"
          className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-mono font-semibold transition-all ${
            voice.mode === 'text'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/35'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Текст</span>
        </button>

        <button
          type="button"
          onClick={() => voice.selectMode('dictate')}
          aria-label="Режим гласово диктуване в полето за текст"
          className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-mono font-semibold transition-all ${
            voice.mode === 'dictate'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/35'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Mic className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Диктуване</span>
        </button>

        <button
          type="button"
          onClick={() => voice.selectMode('hands_free')}
          aria-label="Режим гласов разговор без ръце (Hands-Free)"
          className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-mono font-semibold transition-all ${
            voice.mode === 'hands_free'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Гласов разговор</span>
        </button>
      </div>

      {voice.mode !== 'text' && (
        <div className="flex items-center gap-2">
          {voice.isSpeaking && (
            <button
              type="button"
              onClick={voice.stopSpeaking}
              aria-label="Спри гласовото четене"
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-mono text-amber-300"
            >
              <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Спри гласа</span>
            </button>
          )}

          <button
            type="button"
            disabled={isSending}
            onClick={() =>
              voice.isListening
                ? voice.stopListening()
                : voice.startListening(voice.mode)
            }
            aria-label={voice.isListening ? 'Спри микрофона' : 'Включи микрофона'}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-[11px] font-mono font-bold transition-all ${
              voice.isListening
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25'
            }`}
          >
            {voice.isListening ? (
              <>
                <MicOff className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Слушам... (Спри)</span>
              </>
            ) : (
              <>
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Говори сега</span>
              </>
            )}
          </button>
        </div>
      )}

      {voice.voiceHint && (
        <p className="w-full text-[11px] font-mono text-amber-300">{voice.voiceHint}</p>
      )}
    </div>
  );
};
