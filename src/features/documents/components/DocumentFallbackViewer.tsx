'use client';

import React from 'react';
import { Download, FileText } from 'lucide-react';

interface DocumentFallbackViewerProps {
  readonly originalFileName: string;
  readonly summaryText: string;
  readonly signedUrl: string;
}

export const DocumentFallbackViewer: React.FC<DocumentFallbackViewerProps> = ({
  originalFileName,
  summaryText,
  signedUrl,
}) => (
  <div className="max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950/90 p-6 text-center space-y-4">
    <FileText className="mx-auto h-12 w-12 text-cyan-400" aria-hidden="true" />
    <p className="text-sm font-semibold text-white">{originalFileName}</p>
    {summaryText && (
      <p className="text-xs text-zinc-300 leading-relaxed text-left whitespace-pre-wrap">
        {summaryText}
      </p>
    )}
    <a
      href={signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Свали оригиналния файл ${originalFileName}`}
      className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/25"
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      <span>Свали оригиналния файл</span>
    </a>
  </div>
);
