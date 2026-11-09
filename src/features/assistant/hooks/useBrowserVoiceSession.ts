'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type CommunicationMode = 'text' | 'dictate' | 'hands_free';

interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly 0?: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    readonly [index: number]: SpeechRecognitionResultLike | undefined;
  };
}

interface SpeechRecognitionInstanceLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstanceLike;

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const win = window as unknown as {
    readonly SpeechRecognition?: SpeechRecognitionConstructor;
    readonly webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
};

interface UseBrowserVoiceSessionInput {
  readonly latestAssistantReply: { readonly id: string; readonly text: string } | null;
  readonly onAppendDictatedText: (text: string) => void;
  readonly onHandsFreeSend: (text: string) => Promise<void>;
}

export const useBrowserVoiceSession = ({
  latestAssistantReply,
  onAppendDictatedText,
  onHandsFreeSend,
}: UseBrowserVoiceSessionInput) => {
  const [mode, setMode] = useState<CommunicationMode>('text');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);
  const modeRef = useRef<CommunicationMode>(mode);
  modeRef.current = mode;
  const lastSpokenMessageIdRef = useRef<string | null>(
    latestAssistantReply?.id ?? null
  );

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore stop errors when already stopped
    }
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const startListening = useCallback(
    (targetMode: CommunicationMode) => {
      const RecognitionCtor = getSpeechRecognitionConstructor();
      if (!RecognitionCtor) {
        setVoiceHint(
          'Вашият браузър не поддържа гласово разпознаване (използвайте Chrome, Edge или Safari).'
        );
        return;
      }

      stopListening();
      stopSpeaking();
      setVoiceHint(null);

      try {
        const instance = new RecognitionCtor();
        instance.lang = 'bg-BG';
        instance.continuous = false;
        instance.interimResults = false;

        instance.onresult = (event) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const res = event.results[i];
            if (res?.isFinal && res[0]?.transcript) {
              finalTranscript += `${res[0].transcript} `;
            }
          }
          const cleaned = finalTranscript.trim();
          if (!cleaned) return;

          if (targetMode === 'hands_free') {
            void onHandsFreeSend(cleaned);
          } else {
            onAppendDictatedText(cleaned);
          }
        };

        instance.onerror = () => setIsListening(false);
        instance.onend = () => setIsListening(false);

        recognitionRef.current = instance;
        instance.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    },
    [onAppendDictatedText, onHandsFreeSend, stopListening, stopSpeaking]
  );

  useEffect(() => {
    if (!latestAssistantReply) return;
    if (lastSpokenMessageIdRef.current === null) {
      lastSpokenMessageIdRef.current = latestAssistantReply.id;
      return;
    }
    if (lastSpokenMessageIdRef.current === latestAssistantReply.id) return;
    lastSpokenMessageIdRef.current = latestAssistantReply.id;

    if (
      modeRef.current === 'hands_free' &&
      typeof window !== 'undefined' &&
      'speechSynthesis' in window
    ) {
      window.speechSynthesis.cancel();
      const plainText = latestAssistantReply.text
        .replace(/[*#_`~>-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!plainText) return;

      const utterance = new SpeechSynthesisUtterance(plainText.slice(0, 900));
      utterance.lang = 'bg-BG';
      utterance.rate = 1.03;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  }, [latestAssistantReply]);

  useEffect(() => {
    return () => {
      stopListening();
      stopSpeaking();
    };
  }, [stopListening, stopSpeaking]);

  const selectMode = (nextMode: CommunicationMode) => {
    setMode(nextMode);
    setVoiceHint(null);
    if (nextMode === 'text') {
      stopListening();
      stopSpeaking();
    } else {
      startListening(nextMode);
    }
  };

  return {
    mode,
    isListening,
    isSpeaking,
    voiceHint,
    selectMode,
    startListening,
    stopListening,
    stopSpeaking,
  };
};
