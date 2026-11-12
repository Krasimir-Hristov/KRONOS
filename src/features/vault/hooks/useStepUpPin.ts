'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { authApiResponseSchema } from '@/features/auth';

interface UseStepUpPinOptions {
  readonly onUnlocked: (expiresAtMs: number) => void;
}

export const useStepUpPin = ({ onUnlocked }: UseStepUpPinOptions) => {
  const t = useTranslations('auth');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  const submitStepUpPin = async (digits: string) => {
    setIsVerifyingPin(true);
    setPinError(null);
    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: digits, isStepUp: true }),
      });
      const rawJson: unknown = await res.json().catch(() => null);
      const parsed = authApiResponseSchema.safeParse(rawJson);

      if (!res.ok || !parsed.success || !parsed.data.ok) {
        const errorMsg = parsed.success ? parsed.data.errorMessage : null;
        setPinInput('');
        setPinError(errorMsg ?? t('stepUpInvalidPin'));
        return;
      }

      const expiresAtMs = parsed.data.data?.expiresAtMs;
      if (typeof expiresAtMs !== 'number') {
        setPinInput('');
        setPinError(t('stepUpInvalidResponse'));
        return;
      }

      setPinInput('');
      onUnlocked(expiresAtMs);
    } catch {
      setPinInput('');
      setPinError(t('stepUpError'));
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handlePinChange = (rawVal: string) => {
    const clean = rawVal.replace(/\D/g, '').slice(0, 4);
    setPinInput(clean);
    if (clean.length === 4) {
      void submitStepUpPin(clean);
    }
  };

  return {
    pinInput,
    setPinInput,
    pinError,
    setPinError,
    isVerifyingPin,
    handlePinChange,
  };
};
