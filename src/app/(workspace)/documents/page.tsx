import React from 'react';
import type { Metadata } from 'next';
import { requireAuthAndPin } from '@/features/auth/server';
import { ModuleStageCard } from '@/components/layout/ModuleStageCard';

export const metadata: Metadata = {
  title: 'Документен RAG Сейф & Търсачка',
  description:
    'Частно съхранение на PDF и снимки до 50 MB в Supabase Storage (kronos-vault), OCR и мигновено търсене.',
};

const DocumentsPage: React.FC = async () => {
  await requireAuthAndPin();
  return <ModuleStageCard section="documents" />;
};

export default DocumentsPage;
