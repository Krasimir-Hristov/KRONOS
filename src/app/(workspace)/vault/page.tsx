import React from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getCryptoSecrets } from '@/config/envConfig';
import {
  getVerifiedPinCookieExpiry,
  requireAuthAndPin,
} from '@/features/auth/server';
import { VaultWorkspace, type VaultFactItem } from '@/features/vault';
import { listVaultFacts } from '@/features/vault/server';
import { STEP_UP_PIN_COOKIE_NAME } from '@/proxy';

export const metadata: Metadata = {
  title: 'Лични Данни & Криптирани Пароли',
  description:
    'Сейф за Steuer-ID, IBAN, Kaltmiete и AES-256-GCM криптирани пароли със Step-Up 4-цифрен ПИН.',
};

const getInitialStepUpExpiry = async (userId: string): Promise<number | null> => {
  try {
    const cookieStore = await cookies();
    const stepUpCookie = cookieStore.get(STEP_UP_PIN_COOKIE_NAME)?.value;
    const { pinSecret } = getCryptoSecrets();
    return getVerifiedPinCookieExpiry(stepUpCookie, userId, pinSecret, 'step_up');
  } catch {
    return null;
  }
};

const loadInitialVaultFacts = async (): Promise<{
  readonly initialFacts?: readonly VaultFactItem[];
  readonly initialLoadError: string | null;
}> => {
  try {
    const initialFacts = await listVaultFacts();
    return { initialFacts, initialLoadError: null };
  } catch (err) {
    console.error('[VaultPage] Failed to load initial facts:', err);
    return {
      initialFacts: undefined,
      initialLoadError: 'Неуспешно зареждане на личните данни от сейфа.',
    };
  }
};

const VaultPage: React.FC = async () => {
  const { userId } = await requireAuthAndPin();
  const [stepUpExpiresAtMs, factsResult] = await Promise.all([
    getInitialStepUpExpiry(userId),
    loadInitialVaultFacts(),
  ]);

  return (
    <VaultWorkspace
      initialFacts={factsResult.initialFacts}
      initialLoadError={factsResult.initialLoadError}
      initialStepUpExpiresAtMs={stepUpExpiresAtMs}
    />
  );
};

export default VaultPage;
