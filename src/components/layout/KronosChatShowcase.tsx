'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Columns2, PanelLeftOpen, Timer } from 'lucide-react';
import { ChatComposerFooter } from './ChatComposerFooter';
import { ChatDocumentSplitViewer } from './ChatDocumentSplitViewer';
import { ChatMessageStream } from './ChatMessageStream';
import {
  MOCK_CHAT_SESSIONS,
  type MockChatMessage,
  type MockDocumentAttachment,
} from './kronosChatMockData';
import { NeuralCornerCanvas } from './NeuralCornerCanvas';
import { useSidebar } from './SidebarContext';

export const KRONOS_SESSION_EVENT = 'kronos:select-session';

const formatNowTime = (): string => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss} ч.`;
};

export const KronosChatShowcase: React.FC = () => {
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const [activeSessionId, setActiveSessionId] = useState<string>('new');
  const [customMessages, setCustomMessages] = useState<readonly MockChatMessage[]>([]);
  const [promptText, setPromptText] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [thinkingStartedAt, setThinkingStartedAt] = useState<string | null>(null);
  const [isSplitOpen, setIsSplitOpen] = useState<boolean>(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>('doc-uploaded-kiz-form');
  const [splitWidthPx, setSplitWidthPx] = useState<number>(430);

  const allSessionDocuments = useMemo((): readonly MockDocumentAttachment[] => {
    const collected: MockDocumentAttachment[] = [];
    for (const msg of customMessages) {
      if (msg.userUploadedDoc) collected.push(msg.userUploadedDoc);
      if (msg.documents) collected.push(...msg.documents);
    }
    if (collected.length === 0) {
      const defaultDocs = MOCK_CHAT_SESSIONS[0]?.messages[1]?.documents;
      return defaultDocs ?? [];
    }
    return collected;
  }, [customMessages]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      if (isThinking) return;
      setActiveSessionId(sessionId);
      if (sessionId === 'new') {
        setCustomMessages([]);
        setIsSplitOpen(false);
        setSelectedDocId(null);
        return;
      }
      const found = MOCK_CHAT_SESSIONS.find((s) => s.id === sessionId);
      const msgs = found ? found.messages : [];
      setCustomMessages(msgs);
      const firstDoc = msgs[0]?.userUploadedDoc?.id ?? msgs[1]?.documents?.[0]?.id ?? null;
      setSelectedDocId(firstDoc);
    },
    [isThinking]
  );

  useEffect(() => {
    const onSessionEvent = (ev: Event) => {
      const customEv = ev as CustomEvent<string>;
      if (typeof customEv.detail === 'string') handleSelectSession(customEv.detail);
    };
    window.addEventListener(KRONOS_SESSION_EVENT, onSessionEvent);
    return () => window.removeEventListener(KRONOS_SESSION_EVENT, onSessionEvent);
  }, [handleSelectSession]);

  const handleInspectDocument = (docId: string) => {
    setSelectedDocId(docId);
    setIsSplitOpen(true);
  };

  const handleStartSplitResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = splitWidthPx;

    const onMouseMove = (moveEv: MouseEvent) => {
      const delta = startX - moveEv.clientX;
      setSplitWidthPx(Math.min(680, Math.max(300, startWidth + delta)));
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const triggerSimulatedThinking = (userQuestionText?: string) => {
    if (isThinking) return;
    const askedAt = formatNowTime();

    if (userQuestionText && userQuestionText.trim().length > 0) {
      const userMsg: MockChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        timestamp: askedAt,
        content: userQuestionText.trim(),
      };
      setCustomMessages((prev) => [...prev, userMsg]);
      setPromptText('');
    }

    setThinkingStartedAt(askedAt);
    setIsThinking(true);

    window.setTimeout(() => {
      const answeredAt = formatNowTime();
      if (userQuestionText && userQuestionText.trim().length > 0) {
        const sampleDocs = MOCK_CHAT_SESSIONS[0]?.messages[1]?.documents?.slice(0, 2);
        const aiReply: MockChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          timestamp: answeredAt,
          responseDuration: '3.2 сек',
          modelTag: 'KRONOS Neural v2 • UI Симулация',
          content:
            'Това е визуална UI демонстрация на отговор от KRONOS AI. Можете да разгледате откритите документи директно тук или да отворите досието вдясно с бутона „Отвори в досието“.',
          documents: sampleDocs,
          facts: MOCK_CHAT_SESSIONS[0]?.messages[1]?.facts?.slice(0, 2),
        };
        setCustomMessages((prev) => [...prev, aiReply]);
        if (sampleDocs?.[0]) {
          setSelectedDocId(sampleDocs[0].id);
        }
      }
      setIsThinking(false);
      setThinkingStartedAt(null);
    }, 3200);
  };

  const activeSessionTitle =
    activeSessionId === 'new'
      ? 'Нов разговор'
      : (MOCK_CHAT_SESSIONS.find((s) => s.id === activeSessionId)?.title ?? 'Разговор с KRONOS AI');

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      {/* Top Header Bar with In-Flow Menu Button (Level with Sidebar Header h-14) */}
      <header className="relative z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-teal-950/80 bg-[#060a0e]/95 px-4 backdrop-blur-2xl sm:px-6">
        <div className="flex items-center gap-2.5 min-w-0">
          {!isSidebarOpen && (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Отвори страничното меню"
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-[#09131b] px-2.5 py-1 text-xs font-bold text-teal-200 hover:border-teal-400 hover:bg-[#0d1d2b] shrink-0"
            >
              <PanelLeftOpen className="h-4 w-4 text-teal-400" aria-hidden="true" />
              <span>Меню</span>
            </button>
          )}
          <span className="h-2 w-2 rounded-full bg-teal-400 shrink-0" />
          <h2 className="truncate text-xs font-bold text-zinc-100 sm:text-sm">
            {activeSessionTitle}
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isThinking}
            onClick={() => setIsSplitOpen((prev) => !prev)}
            aria-label="Покажи или скрий страничния преглед на документи"
            className={`cursor-pointer inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-45 ${
              isSplitOpen
                ? 'border-teal-400/60 bg-teal-500/20 text-teal-200'
                : 'border-zinc-800 bg-[#0b131a] text-zinc-300 hover:border-teal-500/40'
            }`}
          >
            <Columns2 className="h-3.5 w-3.5 text-teal-400" aria-hidden="true" />
            <span>{isSplitOpen ? 'Скрий досието' : `Досие (${allSessionDocuments.length})`}</span>
          </button>

          <button
            type="button"
            disabled={isThinking}
            onClick={() => triggerSimulatedThinking()}
            aria-label="Симулирай мислене и пулсиране на невронните мрежи"
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-teal-400/50 bg-linear-to-r from-teal-500/20 via-cyan-500/15 to-emerald-500/20 px-3.5 py-1.5 text-xs font-bold text-teal-100 shadow-md transition-all hover:border-teal-300 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isThinking ? (
              <Activity className="h-3.5 w-3.5 animate-spin text-teal-300" aria-hidden="true" />
            ) : (
              <Timer className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
            )}
            <span>{isThinking ? 'Мрежите пулсират...' : 'Симулирай мислене'}</span>
          </button>
        </div>
      </header>

      {/* Split-Screen Main Body: Left = Chat / Hero, Right = Live Document Dossier */}
      <div className="relative z-10 flex flex-1 min-w-0 overflow-hidden">
        <NeuralCornerCanvas isThinking={isThinking} />
        <div className="relative z-10 flex flex-1 min-w-0 flex-col justify-between overflow-y-auto">
          <ChatMessageStream
            messages={customMessages}
            isThinking={isThinking}
            thinkingStartedAt={thinkingStartedAt}
            onInspectDocument={handleInspectDocument}
          />
          <ChatComposerFooter
            promptText={promptText}
            isThinking={isThinking}
            onPromptChange={setPromptText}
            onSubmit={() => triggerSimulatedThinking(promptText)}
          />
        </div>

        {isSplitOpen && allSessionDocuments.length > 0 && (
          <div style={{ width: `${splitWidthPx}px` }} className="hidden md:flex relative h-full shrink-0">
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Промени ширината на досието"
              onMouseDown={handleStartSplitResize}
              className="group absolute inset-y-0 -left-1 z-30 w-2 cursor-col-resize flex items-center justify-center select-none"
            >
              <span className="h-16 w-1 rounded-full bg-teal-500/30 transition-colors group-hover:bg-teal-400" />
            </div>
            <div className="flex-1 h-full overflow-hidden">
              <ChatDocumentSplitViewer
                documents={allSessionDocuments}
                selectedDocId={selectedDocId}
                onSelectDoc={setSelectedDocId}
                onClose={() => setIsSplitOpen(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
