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
      initialFacts = await listVaultFacts();
    } catch (err) {
      initialLoadError =
        err instanceof Error ? err.message : 'Грешка при зареждане на личните данни.';
    }
    initialStepUpExpiresAtMs = await getStepUpPinExpiryMs(userId);
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
