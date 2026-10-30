import React from 'react';
import type { Metadata } from 'next';
import { ModuleStageCard } from '@/components/layout/ModuleStageCard';

export const metadata: Metadata = {
  title: 'Документен Сейф & Търсачка',
  description:
    'Сигурно съхранение на PDF и снимки в Cloudflare R2, OCR анализ и мигновено SQL търсене.',
};

const DocumentsPage: React.FC = () => {
  return <ModuleStageCard section="documents" />;
};

export default DocumentsPage;
