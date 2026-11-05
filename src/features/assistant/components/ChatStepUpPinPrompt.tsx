'use client';

import React, { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { verifyStepUpPinAction } from '@/features/auth';

interface ChatStepUpPinPromptProps {
  readonly onUnlocked: () => void;
}

export const ChatStepUpPinPrompt: React.FC<ChatStepUpPinPromptProps> = ({
  onUnlocked,
}) => {
  const [pinDigits, setPinDigits] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handlePinInput = async (raw: string) => {
    const clean = raw.replace(/\D/g, '').slice(0, 4);
    setPinDigits(clean);
    if (clean.length < 4) return;

    setIsVerifying(true);
    setPinError(null);
    try {
      const res = await verifyStepUpPinAction({ pin: clean });
      setPinDigits('');
      if (!res.ok) {
        setPinError(res.errorMessage);
        return;
      }
      onUnlocked();
    } catch {
      setPinDigits('');
      setPinError('Грешка при проверка на ПИН кода.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <article className="mt-3 rounded-2xl border border-violet-500/30 bg-zinc-950/90 p-4 shadow-lg">
      <div className="flex items-center gap-2.5 text-violet-300">
        <LockKeyhole className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-xs font-bold tracking-wide">
          Потвърдете 4-цифрения Step-Up ПИН за достъп до Пароли
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          disabled={isVerifying}
          value={pinDigits}
          onChange={(e) => void handlePinInput(e.target.value)}
          aria-label="Step-Up 4-цифрен ПИН за пароли"
          placeholder="••••"
          className="w-32 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-center text-lg tracking-[0.5em] font-mono font-bold text-cyan-400 focus:border-cyan-500 focus:outline-none"
        />
        <span className="text-[11px] text-zinc-400">
          Отключва криптирания AES-256-GCM сейф за 5 минути без изпращане към AI.
        </span>
      </div>
      {pinError && (
        <p role="alert" className="mt-2 text-xs text-rose-400">
          {pinError}
        </p>
      )}
    </article>
  );
};
