import React from 'react';
import type { Metadata } from 'next';
import { ModuleStageCard } from '@/components/layout/ModuleStageCard';

export const metadata: Metadata = {
  title: 'Финансов Съветник',
  description:
    'Месечен финансов анализ на банкови извлечения (Kontoauszüge) и касови разходи.',
};

const FinancePage: React.FC = () => {
  return <ModuleStageCard section="finance" />;
};

export default FinancePage;
