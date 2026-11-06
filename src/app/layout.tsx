import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { QueryProvider } from '@/providers/QueryProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic', 'greek'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'KRONOS — Личен AI Асистент, Документен Сейф & Памет',
    template: '%s | KRONOS',
  },
  description:
    'KRONOS (Κρόνος) — Личен модулен AI Асистент и Документен Сейф за документи (DE/BG/EL), криптирани пароли и немска бюрокрация.',
};

export const viewport: Viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
};

interface RootLayoutProps {
  readonly children: React.ReactNode;
}

const RootLayout: React.FC<RootLayoutProps> = async ({ children }) => {
  const messages = await getMessages();

  return (
    <html lang="bg" className="dark">
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>{children}</QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
