import React from 'react';
import type { Metadata } from 'next';
import { requireAuthAndPin } from '@/features/auth/server';
import { ModuleStageCard } from '@/components/layout/ModuleStageCard';

export const metadata: Metadata = {
  title: 'AI Асистент & Главен Център',
  description: 'Личен AI Асистент KRONOS за документи, лични факти и немска бюрокрация.',
};

const WorkspaceHomePage: React.FC = async () => {
  await requireAuthAndPin();
  return <ModuleStageCard section="chat" />;
};

export default WorkspaceHomePage;
