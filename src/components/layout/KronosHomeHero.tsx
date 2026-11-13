'use client';

import React from 'react';

interface KronosHomeHeroProps {
  readonly isThinking?: boolean;
}

export const KronosHomeHero: React.FC<KronosHomeHeroProps> = () => {
  return (
    <section
      aria-label="Начален екран KRONOS"
      className="relative flex flex-1 flex-col items-center justify-center px-4 select-none overflow-hidden"
    >
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        {/* Soft Ambient Core Glow Behind Title */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-24 -inset-y-16 rounded-full bg-radial from-teal-500/20 via-teal-500/5 to-transparent blur-3xl"
        />

        {/* Minimalist Centered Title "KRONOS" with continuous left-to-right glint */}
        <h1 className="relative animate-kronos-glint text-5xl sm:text-7xl lg:text-8xl font-black tracking-[0.28em] uppercase select-none drop-shadow-[0_0_36px_rgba(45,212,191,0.38)]">
          KRONOS
        </h1>
      </div>
    </section>
  );
};
