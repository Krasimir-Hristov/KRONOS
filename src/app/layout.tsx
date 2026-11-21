import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const interSans = Inter({
  variable: '--font-inter-sans',
  subsets: ['latin', 'cyrillic', 'greek'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin', 'cyrillic', 'greek'],
});

export const metadata: Metadata = {
  title: 'KRONOS — Личен AI Супервайзър и Документен Сейф',
  description:
    'KRONOS обединява LangGraph супервайзър, многоезичен RAG сейф и сигурно управление на лични данни.',
};

const RootLayout = ({ children }: LayoutProps<'/'>) => {
  return (
    <html
      lang="bg"
      className={`${interSans.variable} ${jetbrainsMono.variable} h-full dark antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#060a0e] text-slate-100 font-sans">
        {children}
      </body>
    </html>
  );
};

export default RootLayout;
