import React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { QueryProvider } from '@/providers/QueryProvider';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { AppShell } from '@/components/layout/AppShell';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic', 'greek'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'KRONOS — Личен & Семеен AI Асистент и Архив',
    template: '%s | KRONOS',
  },
  description:
    'KRONOS (Κρόνος) — Защитен семеен документен сейф и мулти-агентен AI асистент на български и гръцки език.',
};

interface RootLayoutProps {
  readonly children: React.ReactNode;
}

const RootLayout: React.FC<RootLayoutProps> = ({ children }) => {
  return (
    <html lang="bg" className="dark">
      <body className={inter.className}>
        <QueryProvider>
          <LanguageProvider>
            <AppShell>{children}</AppShell>
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  );
};

export default RootLayout;
