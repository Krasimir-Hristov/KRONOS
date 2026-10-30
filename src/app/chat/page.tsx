import React from 'react';
import type { Metadata } from 'next';
import { ModuleStageCard } from '@/components/layout/ModuleStageCard';

export const metadata: Metadata = {
  title: 'Личен AI Асистент & Детски Учител',
  description:
    'Ежедневен AI чат за двата профила, спешен превод от камера и режим Учител с ПИН защита.',
};

const ChatPage: React.FC = () => {
  return <ModuleStageCard section="chat" />;
};

export default ChatPage;
