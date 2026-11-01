import React from 'react';
import type { Metadata } from 'next';
import { ModuleStageCard } from '@/components/layout/ModuleStageCard';

export const metadata: Metadata = {
  title: 'Документен RAG Сейф & Търсачка',
  description:
    'Сигурно съхранение на PDF и снимки до 50 MB в частен Supabase Storage сейф, OCR анализ и мигновено търсене.',
};

const DocumentsPage: React.FC = () => {
  return <ModuleStageCard section="documents" />;
};

export default DocumentsPage;
