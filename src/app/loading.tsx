import React from 'react';
import { getTranslations } from 'next-intl/server';

const Loading: React.FC = async () => {
  const t = await getTranslations('loadingPage');

  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">
        {t('message')}
      </div>
      <main
        aria-busy="true"
        aria-label={t('ariaLabel')}
        className="min-h-screen flex items-center justify-center bg-zinc-950"
      >
        <span
          aria-hidden="true"
          className="h-8 w-8 rounded-full border-2 border-cyan-400 border-t-transparent motion-safe:animate-spin"
        />
      </main>
    </>
  );
};

export default Loading;
