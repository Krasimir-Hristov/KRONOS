import React from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getCryptoSecrets } from '@/config/envConfig';
import {
  requireAuthAndPin,
  verifyEncryptedPinCookie,
} from '@/features/auth/server';
import { VaultWorkspace, type VaultFactItem } from '@/features/vault';
import { listVaultFacts } from '@/features/vault/server';
import { STEP_UP_PIN_COOKIE_NAME } from '@/proxy';

export const metadata: Metadata = {
  title: 'Лични Данни & Криптирани Пароли',
  description:
    'Сейф за Steuer-ID, IBAN, Kaltmiete и AES-256-GCM криптирани пароли със Step-Up 4-цифрен ПИН.',
};

const checkInitialStepUpStatus = async (userId: string): Promise<boolean> => {
  try {
    const cookieStore = await cookies();
    const stepUpCookie = cookieStore.get(STEP_UP_PIN_COOKIE_NAME)?.value;
    const { pinSecret } = getCryptoSecrets();
    return verifyEncryptedPinCookie(stepUpCookie, userId, pinSecret);
  } catch {
    return false;
  }
};

const loadInitialVaultFacts = async (): Promise<readonly VaultFactItem[]> => {
  try {
    return await listVaultFacts();
  } catch {
    return [];
  }
};

const VaultPage: React.FC = async () => {
  const { userId } = await requireAuthAndPin();
  const [isStepUpUnlocked, initialFacts] = await Promise.all([
    checkInitialStepUpStatus(userId),
    loadInitialVaultFacts(),
  ]);

  return (
    <VaultWorkspace
      initialFacts={initialFacts}
      initialStepUpUnlocked={isStepUpUnlocked}
    />
  );
};

export default VaultPage;
