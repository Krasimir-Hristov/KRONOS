import React from 'react';
import type { Metadata } from 'next';
import { OverviewDashboard } from '@/components/layout/OverviewDashboard';

export const metadata: Metadata = {
  title: 'Начало — Семеен Център и Архив',
  description:
    'Начален панел на KRONOS за бърз достъп до AI Чат, Документен сейф, Финанси и Семеен център.',
};

const HomePage: React.FC = () => {
  return <OverviewDashboard />;
};

export default HomePage;
