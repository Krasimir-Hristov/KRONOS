import React from 'react';
import type { Metadata } from 'next';
import { ModuleStageCard } from '@/components/layout/ModuleStageCard';

export const metadata: Metadata = {
  title: 'Семеен Център & Списък за Пазаруване',
  description:
    'Споделен списък за пазаруване в реално време, профили на децата и запазени музикални плейлисти.',
};

const FamilyPage: React.FC = () => {
  return <ModuleStageCard section="family" />;
};

export default FamilyPage;
