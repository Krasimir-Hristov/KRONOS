import React from 'react';
import type { Metadata } from 'next';
import { requireAuthAndPin, getStepUpPinExpiryMs } from '@/features/auth/server';
import {
  MOCK_VAULT_FACTS,
  VaultWorkspace,
  type VaultFactItem,
} from '@/features/vault';
import { listVaultFacts } from '@/features/vault/server';

export const metadata: Metadata = {
  title: 'Лични Данни & Криптирани Пароли',
  description:
    'Сейф за Steuer-ID, IBAN, Kaltmiete и AES-256-GCM криптирани пароли със Step-Up 4-цифрен ПИН.',
};

interface VaultPageProps {
  readonly searchParams: Promise<{ readonly demo?: string }>;
}

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs = 2500): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Времето за връзка към трезора изтече.')), timeoutMs);
    }),
  ]);
};

const VaultPage: React.FC<VaultPageProps> = async ({ searchParams }) => {
  const { userId } = await requireAuthAndPin();
  const params = await searchParams;
  const isDemo = params.demo === 'true';

  let initialFacts: readonly VaultFactItem[] = [];
  let initialLoadError: string | null = null;
  let initialStepUpExpiresAtMs: number | null = null;

  if (isDemo) {
    initialFacts = MOCK_VAULT_FACTS;
  } else {
    try {
      initialFacts = await withTimeout(listVaultFacts());
    } catch (err) {
      initialLoadError =
        err instanceof Error ? err.message : 'Грешка при зареждане на личните данни.';
    }
    try {
      initialStepUpExpiresAtMs = await withTimeout(getStepUpPinExpiryMs(userId), 1500);
    } catch {
      initialStepUpExpiresAtMs = null;
    }
  }

  return (
    <VaultWorkspace
      initialFacts={initialFacts}
      initialLoadError={initialLoadError}
      initialStepUpExpiresAtMs={initialStepUpExpiresAtMs}
      isDemo={isDemo}
    />
  );
};

export default VaultPage;
