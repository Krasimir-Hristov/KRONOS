'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Delete, KeyRound, Lock, RotateCcw, ShieldAlert } from 'lucide-react';
import {
  lockPinAction,
  setupOrVerifyPinAction,
  verifyStepUpPinAction,
} from '../dal/authActions';

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
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirmingSetup, setIsConfirmingSetup] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDigit = (digit: string) => {
    if (isPending) return;
    setErrorMessage(null);

    if (!initialHasPin && !isStepUp) {
      if (!isConfirmingSetup) {
        if (pin.length < 4) {
          const next = pin + digit;
          setPin(next);
          if (next.length === 4) setIsConfirmingSetup(true);
        }
      } else {
        if (confirmPin.length < 4) {
          const next = confirmPin + digit;
          setConfirmPin(next);
          if (next.length === 4) triggerSetup(pin, next);
        }
      }
      return;
    }

    if (pin.length < 4) {
      const next = pin + digit;
      setPin(next);
      if (next.length === 4) triggerVerify(next);
    }
  };

  const handleDelete = () => {
    if (isPending) return;
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
    if (isPending) return;
    setPin('');
    setConfirmPin('');
    setIsConfirmingSetup(false);
    setErrorMessage(null);
  };

  const triggerVerify = (code: string) => {
    startTransition(async () => {
      const result = isStepUp
        ? await verifyStepUpPinAction({ pin: code })
        : await setupOrVerifyPinAction({ pin: code });

      if (!result.ok) {
        setErrorMessage(result.errorMessage);
        setPin('');
        return;
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/');
        router.refresh();
      }
    });
  };

  const triggerSetup = (firstPin: string, secondPin: string) => {
    startTransition(async () => {
      const result = await setupOrVerifyPinAction({
        pin: firstPin,
        confirmPin: secondPin,
      });

      if (!result.ok) {
        setErrorMessage(result.errorMessage);
        setPin('');
        setConfirmPin('');
        setIsConfirmingSetup(false);
        return;
      }

      router.push('/');
      router.refresh();
    });
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

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="rounded-3xl border border-slate-800 bg-linear-to-b from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-8 shadow-2xl text-center">
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4 shadow-lg">
          {isStepUp ? <KeyRound className="h-7 w-7" aria-hidden="true" /> : <Lock className="h-7 w-7" aria-hidden="true" />}
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white">
          {isStepUp ? 'Step-Up ПИН за Пароли' : !initialHasPin ? (isConfirmingSetup ? 'Потвърдете ПИН' : 'Създайте 4-цифрен ПИН') : 'Въведете 4-цифрен ПИН'}
        </h1>
        <p className="mt-1.5 text-xs text-slate-400">
          {isStepUp
            ? 'Потвърдете вашия ПИН за отключване на криптираните пароли.'
            : !initialHasPin
              ? (isConfirmingSetup ? 'Въведете същите 4 цифри още веднъж.' : 'Задайте 4 цифри за бърз банков достъп.')
              : 'Отключва се автоматично при 4-тата цифра.'}
        </p>

        {errorMessage && (
          <div role="alert" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-300">
            <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex justify-center gap-4 my-6" aria-label="Индикатор за въведени цифри">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = index < activeInput.length;
            return (
              <span
                key={index}
                className={`h-4 w-4 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'scale-110 bg-amber-400 shadow-md shadow-amber-400/50'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isPending}
              aria-label={`Цифра ${digit}`}
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xl font-semibold text-white hover:bg-slate-800/60 active:scale-95 disabled:opacity-50 transition-all"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            disabled={isPending}
            aria-label="Изчисти всичко"
            onClick={handleClear}
            className="h-14 rounded-2xl bg-slate-950/40 border border-slate-850 text-slate-400 flex items-center justify-center hover:text-white active:scale-95 transition-all"
          >
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={isPending}
            aria-label="Цифра 0"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xl font-semibold text-white hover:bg-slate-800/60 active:scale-95 disabled:opacity-50 transition-all"
          >
            0
          </button>
          <button
            type="button"
            disabled={isPending}
            aria-label="Изтрий последна цифра"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-950/40 border border-slate-850 text-slate-400 flex items-center justify-center hover:text-white active:scale-95 transition-all"
          >
            <Delete className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {!isStepUp && (
          <div className="mt-6 pt-4 border-t border-slate-850 flex justify-center">
            <button
              type="button"
              onClick={() => lockPinAction()}
              aria-label="Заключи или смени потребител"
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Вход с друг профил
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
