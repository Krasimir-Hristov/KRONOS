import React from 'react';
import type { Metadata } from 'next';
import { requireAuthAndPin } from '@/features/auth/server';
import { ModuleStageCard } from '@/components/layout/ModuleStageCard';

export const metadata: Metadata = {
  title: 'Лични Данни & Криптирани Пароли',
  description:
    'Сейф за лични номера, IBAN, Kaltmiete и AES-256-GCM криптирани пароли със Step-Up 4-цифрен ПИН.',
};

const VaultPage: React.FC = async () => {
  await requireAuthAndPin();
  return <ModuleStageCard section="vault" />;
};

export default VaultPage;
