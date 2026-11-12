import React from 'react';
import type { Metadata } from 'next';
import { requireAuthAndPin } from '@/features/auth/server';
import { MOCK_VAULT_FACTS, VaultWorkspace } from '@/features/vault';

export const metadata: Metadata = {
  title: 'Лични Данни & Криптирани Пароли (UI Мок)',
  description:
    'Сейф за Steuer-ID, IBAN, Kaltmiete и AES-256-GCM криптирани пароли със Step-Up 4-цифрен ПИН.',
};

const VaultPage: React.FC = async () => {
  await requireAuthAndPin();

  return (
    <VaultWorkspace
      initialFacts={MOCK_VAULT_FACTS}
      initialLoadError={null}
      initialStepUpExpiresAtMs={Date.now() + 300_000}
    />
  );
};

export default VaultPage;
