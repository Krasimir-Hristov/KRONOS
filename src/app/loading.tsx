import React from 'react';

const Loading: React.FC = () => (
  <main
    aria-busy="true"
    aria-label="Зареждане"
    className="min-h-screen flex items-center justify-center bg-zinc-950"
  >
    <span className="h-8 w-8 rounded-full border-2 border-cyan-400 border-t-transparent motion-safe:animate-spin" />
  </main>
);

export default Loading;
