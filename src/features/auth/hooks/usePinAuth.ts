'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { authApiResponseSchema } from '../schemas/authSchema';

interface UsePinAuthOptions {
  readonly isStepUp?: boolean;
  readonly onSuccess?: () => void;
  readonly onClearPin: () => void;
  readonly onClearSetup: () => void;
}

export const usePinAuth = ({
  isStepUp = false,
  onSuccess,
  onClearPin,
  onClearSetup,
}: UsePinAuthOptions) => {
  const queryClient = useQueryClient();
  const t = useTranslations('auth');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSwitchAccount = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const rawJson: unknown = await res.json().catch(() => null);
      const parsed = authApiResponseSchema.safeParse(rawJson);

      if (!res.ok || !parsed.success || !parsed.data.ok) {
        const errorMsg = parsed.success ? parsed.data.errorMessage : null;
        setErrorMessage(errorMsg ?? t('networkError'));
        setIsSubmitting(false);
        return;
      }
      queryClient.clear();
      window.location.replace('/login');
    } catch {
      setErrorMessage(t('networkError'));
      setIsSubmitting(false);
    }
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

      const rawJson: unknown = await res.json().catch(() => null);
      const parsed = authApiResponseSchema.safeParse(rawJson);

      if (!res.ok || !parsed.success || !parsed.data.ok) {
        const errorMsg = parsed.success ? parsed.data.errorMessage : null;
        setErrorMessage(errorMsg ?? t('invalidPin'));
        onClearPin();
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
      onClearPin();
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

      const rawJson: unknown = await res.json().catch(() => null);
      const parsed = authApiResponseSchema.safeParse(rawJson);

      if (!res.ok || !parsed.success || !parsed.data.ok) {
        const errorMsg = parsed.success ? parsed.data.errorMessage : null;
        setErrorMessage(errorMsg ?? t('invalidPin'));
        onClearSetup();
        setIsSubmitting(false);
        return;
      }

      window.location.replace('/');
    } catch {
      setErrorMessage(t('networkError'));
      onClearSetup();
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    errorMessage,
    setErrorMessage,
    handleSwitchAccount,
    triggerVerify,
    triggerSetup,
  };
};
