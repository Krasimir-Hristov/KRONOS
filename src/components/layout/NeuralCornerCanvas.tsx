'use client';

import React from 'react';

interface NeuralCornerCanvasProps {
  readonly isThinking?: boolean;
}

interface CornerConstellationProps {
  readonly positionClass: string;
  readonly transformClass?: string;
  readonly isThinking: boolean;
  readonly gradientId: string;
}

const CornerConstellation: React.FC<CornerConstellationProps> = ({
  positionClass,
  transformClass = '',
  isThinking,
  gradientId,
}) => {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute z-0 h-64 w-64 sm:h-80 sm:w-80 lg:h-96 lg:w-96 transition-all duration-700 ${positionClass} ${
        isThinking ? 'animate-neural-thinking opacity-90' : 'animate-neural-idle opacity-35'
      }`}
    >
      <svg
        viewBox="0 0 320 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`h-full w-full ${transformClass}`}
      >
        <defs>
          <radialGradient id={`${gradientId}-fade`} cx="0%" cy="0%" r="95%">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity={isThinking ? '0.95' : '0.55'} />
            <stop offset="45%" stopColor="#14b8a6" stopOpacity={isThinking ? '0.65' : '0.28'} />
            <stop offset="75%" stopColor="#0d9488" stopOpacity={isThinking ? '0.25' : '0.08'} />
            <stop offset="100%" stopColor="#060a0e" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${gradientId}-pulse`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isThinking ? '#5eead4' : '#14b8a6'} />
            <stop offset="50%" stopColor={isThinking ? '#22d3ee' : '#0d9488'} />
            <stop offset="100%" stopColor={isThinking ? '#10b981' : '#115e59'} />
          </linearGradient>
        </defs>

        <g stroke={`url(#${gradientId}-fade)`} strokeWidth={isThinking ? '1.35' : '0.9'}>
          <path d="M8 12 L78 36 L148 24 L216 58 L268 38" />
          <path d="M12 68 L78 36 L114 96 L186 82 L242 118" />
          <path d="M18 134 L64 112 L114 96 L152 154 L212 146" />
          <path d="M6 196 L58 172 L106 208 L152 154 L196 202" />
          <path d="M36 254 L58 172 L114 96 L148 24" />
          <path d="M78 36 L64 112 L106 208 L142 262" />
          <path d="M148 24 L186 82 L152 154 L106 208" />
          <path d="M216 58 L186 82 L212 146" />
        </g>

        <g
          stroke={`url(#${gradientId}-pulse)`}
          strokeWidth={isThinking ? '2.1' : '1.25'}
          strokeLinecap="round"
          className={isThinking ? 'animate-synapse-fast' : 'animate-synapse-flow'}
        >
          <path d="M8 12 L78 36 L114 96 L152 154 L212 146" />
          <path d="M12 68 L64 112 L114 96 L186 82 L216 58" />
          <path d="M18 134 L58 172 L106 208 L152 154" />
          <path d="M78 36 L148 24 L186 82 L242 118" />
        </g>

        <g fill={`url(#${gradientId}-pulse)`}>
          <circle cx="8" cy="12" r={isThinking ? '4.5' : '3'} />
          <circle cx="78" cy="36" r={isThinking ? '5' : '3.5'} />
          <circle cx="148" cy="24" r={isThinking ? '4.2' : '3'} />
          <circle cx="216" cy="58" r={isThinking ? '3.8' : '2.5'} />
          <circle cx="12" cy="68" r={isThinking ? '4' : '2.8'} />
          <circle cx="114" cy="96" r={isThinking ? '5.5' : '3.8'} />
          <circle cx="186" cy="82" r={isThinking ? '4.2' : '3'} />
          <circle cx="64" cy="112" r={isThinking ? '4' : '2.8'} />
          <circle cx="18" cy="134" r={isThinking ? '3.6' : '2.5'} />
          <circle cx="152" cy="154" r={isThinking ? '4.8' : '3.2'} />
          <circle cx="58" cy="172" r={isThinking ? '4' : '2.8'} />
          <circle cx="106" cy="208" r={isThinking ? '3.8' : '2.5'} />
          <circle cx="212" cy="146" r={isThinking ? '3.2' : '2.2'} />
          <circle cx="242" cy="118" r={isThinking ? '3' : '2'} />
        </g>

        <g
          stroke={isThinking ? '#22d3ee' : '#14b8a6'}
          strokeOpacity={isThinking ? '0.75' : '0.35'}
          strokeWidth="1.2"
        >
          <circle cx="78" cy="36" r={isThinking ? '11' : '7'} />
          <circle cx="114" cy="96" r={isThinking ? '13' : '8.5'} />
          <circle cx="152" cy="154" r={isThinking ? '10' : '6.5'} />
        </g>
      </svg>
    </div>
  );
};

export const NeuralCornerCanvas: React.FC<NeuralCornerCanvasProps> = ({
  isThinking = false,
}) => {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <CornerConstellation
        positionClass="top-0 left-0"
        isThinking={isThinking}
        gradientId="neural-tl"
      />
      <CornerConstellation
        positionClass="top-0 right-0"
        transformClass="-scale-x-100"
        isThinking={isThinking}
        gradientId="neural-tr"
      />
      <CornerConstellation
        positionClass="bottom-0 left-0"
        transformClass="-scale-y-100"
        isThinking={isThinking}
        gradientId="neural-bl"
      />
      <CornerConstellation
        positionClass="bottom-0 right-0"
        transformClass="-scale-x-100 -scale-y-100"
        isThinking={isThinking}
        gradientId="neural-br"
      />
    </div>
  );
};
