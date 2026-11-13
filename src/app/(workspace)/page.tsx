import React from 'react';
import type { Metadata } from 'next';
import { KronosChatShowcase } from '@/components/layout/KronosChatShowcase';
import { requireAuthAndPin } from '@/features/auth/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'KRONOS — AI Асистент & Невронен Чат',
  description:
    'Главен AI чат интерфейс на KRONOS с пулсиращи невронни мрежи, времеви отпечатъци и преглед на документи.',
};

const WorkspaceHomePage: React.FC = async () => {
  await requireAuthAndPin();

  return <KronosChatShowcase />;
};

export default WorkspaceHomePage;
