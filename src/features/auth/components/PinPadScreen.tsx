'use client';

import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Delete, KeyRound, Lock, RotateCcw, ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PinPadScreenProps {
  readonly initialHasPin?: boolean;
  readonly isStepUp?: boolean;
  readonly onSuccess?: () => void;
}

export const PinPadScreen: React.FC<PinPadScreenProps> = ({
  initialHasPin = true,
  isStepUp = false,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const t = useTranslations('auth');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirmingSetup, setIsConfirmingSetup] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDigit = (digit: string) => {
    if (isSubmitting) return;
    setErrorMessage(null);

    if (!initialHasPin && !isStepUp) {
      if (!isConfirmingSetup) {
        if (pin.length < 4) {
          const next = pin + digit;
          setPin(next);
          if (next.length === 4) setIsConfirmingSetup(true);
        }
      } else if (confirmPin.length < 4) {
        const next = confirmPin + digit;
        setConfirmPin(next);
        if (next.length === 4) void triggerSetup(pin, next);
      }
      return;
    }

    if (pin.length < 4) {
      const next = pin + digit;
      setPin(next);
      if (next.length === 4) void triggerVerify(next);
    }
  };

  const handleDelete = () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    if (!initialHasPin && !isStepUp && isConfirmingSetup) {
      if (confirmPin.length > 0) {
        setConfirmPin(confirmPin.slice(0, -1));
      } else {
        setIsConfirmingSetup(false);
        setPin('');
      }
      return;
    }
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isSubmitting) return;
    setPin('');
    setConfirmPin('');
    setIsConfirmingSetup(false);
    setErrorMessage(null);
  };

  const handleSwitchAccount = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    queryClient.clear();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    window.location.replace('/login');
  };

  const triggerVerify = async (code: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: code, isStepUp }),
      });

      const result = (await res.json()) as {
        readonly ok?: boolean;
        readonly errorMessage?: string;
        readonly data?: { readonly expiresAtMs?: number };
      };

      if (!res.ok || !result.ok) {
        setErrorMessage(result.errorMessage ?? t('invalidPin'));
        setPin('');
        setIsSubmitting(false);
        return;
      }

      if (isStepUp && onSuccess) {
        onSuccess();
        setIsSubmitting(false);
        return;
      }

      window.location.replace('/');
    } catch {
      setErrorMessage(t('networkError'));
      setPin('');
      setIsSubmitting(false);
    }
  };

  const triggerSetup = async (firstPin: string, secondPin: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: firstPin, confirmPin: secondPin }),
      });

      const result = (await res.json()) as {
        readonly ok?: boolean;
        readonly errorMessage?: string;
      };

      if (!res.ok || !result.ok) {
        setErrorMessage(result.errorMessage ?? t('invalidPin'));
        setPin('');
        setConfirmPin('');
        setIsConfirmingSetup(false);
        setIsSubmitting(false);
        return;
      }

      window.location.replace('/');
    } catch {
      setErrorMessage(t('networkError'));
      setPin('');
      setConfirmPin('');
      setIsConfirmingSetup(false);
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) handleDigit(e.key);
      else if (e.key === 'Backspace') handleDelete();
      else if (e.key === 'Escape') handleClear();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const activeInput = !initialHasPin && !isStepUp && isConfirmingSetup ? confirmPin : pin;

  const headingText = isStepUp
    ? t('stepUpTitle')
    : !initialHasPin
      ? isConfirmingSetup
        ? t('pinConfirmLabel')
        : t('pinSetupTitle')
      : t('pinTitle');

  const subtitleText = isStepUp
    ? t('stepUpSubtitle')
    : !initialHasPin
      ? isConfirmingSetup
        ? t('pinConfirmSubtitle')
        : t('pinSetupSubtitle')
      : t('pinSubtitle');

  return (
    <div className="w-full max-w-sm mx-auto p-4 sm:p-0">
      <div className="relative rounded-3xl border border-zinc-800/80 bg-zinc-950/85 p-6 sm:p-8 shadow-2xl text-center backdrop-blur-2xl overflow-hidden">
        <div className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 mb-4 shadow-lg shadow-cyan-500/10">
          {isStepUp ? (
            <KeyRound className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Lock
              className={`h-6 w-6 transition-transform duration-300 ${isSubmitting ? 'scale-110 animate-pulse text-cyan-300' : ''}`}
              aria-hidden="true"
            />
          )}
        </div>

        <h1 className="text-lg font-bold tracking-tight text-white">{headingText}</h1>
        <p className="mt-1.5 text-xs text-zinc-400">{subtitleText}</p>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/25 p-2.5 text-xs font-medium text-rose-300"
          >
            <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex justify-center gap-4 my-6" aria-label={t('pinDotsLabel')}>
          {[0, 1, 2, 3].map((index) => {
            const isFilled = index < activeInput.length;
            return (
              <span
                key={index}
                className={`h-3.5 w-3.5 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'scale-125 bg-cyan-400 shadow-md shadow-cyan-400/80 ring-2 ring-cyan-400/30'
                    : 'bg-zinc-800 border border-zinc-700'
                }`}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isSubmitting}
              aria-label={t('pinDigitLabel', { digit })}
              onClick={() => handleDigit(digit)}
              className="h-13 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-lg font-mono font-bold text-white hover:bg-zinc-800 hover:border-cyan-500/40 hover:text-cyan-300 active:scale-95 disabled:opacity-50 transition-all shadow-xs"
            >{digit}</button>
          ))}
          <button
            type="button"
            disabled={isSubmitting}
            aria-label={t('pinClearAll')}
            onClick={handleClear}
            className="h-13 rounded-2xl bg-zinc-900/40 border border-zinc-850 text-zinc-500 flex items-center justify-center hover:text-zinc-200 hover:bg-zinc-850 active:scale-95 transition-all"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            aria-label={t('pinDigitLabel', { digit: '0' })}
            onClick={() => handleDigit('0')}
            className="h-13 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-lg font-mono font-bold text-white hover:bg-zinc-800 hover:border-cyan-500/40 hover:text-cyan-300 active:scale-95 disabled:opacity-50 transition-all shadow-xs"
          >0</button>
          <button
            type="button"
            disabled={isSubmitting}
            aria-label={t('pinDeleteDigit')}
            onClick={handleDelete}
            className="h-13 rounded-2xl bg-zinc-900/40 border border-zinc-850 text-zinc-500 flex items-center justify-center hover:text-zinc-200 hover:bg-zinc-850 active:scale-95 transition-all"
          >
            <Delete className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {!isStepUp && (
          <div className="mt-6 pt-4 border-t border-zinc-800/80 flex justify-center">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSwitchAccount}
              aria-label={t('switchAccountAria')}
              className="text-xs font-mono text-zinc-400 hover:text-cyan-400 disabled:opacity-50 transition-colors"
            >
              {t('switchAccount')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
