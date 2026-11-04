'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUpDown, Search } from 'lucide-react';
import {
  DOCUMENT_TOPIC_LABELS_BG,
  DOCUMENT_TOPICS,
  type DocumentSortMode,
  type DocumentTopic,
} from '../schemas/documentSchema';

interface DocumentSearchBarProps {
  readonly searchInput: string;
  readonly topicFilter: DocumentTopic | '';
  readonly sortBy: DocumentSortMode;
  readonly totalCount: number;
  readonly onSearchChange: (val: string) => void;
  readonly onTopicChange: (topic: DocumentTopic | '') => void;
  readonly onSortChange: (sort: DocumentSortMode) => void;
}

export const DocumentSearchBar: React.FC<DocumentSearchBarProps> = ({
  searchInput,
  topicFilter,
  sortBy,
  totalCount,
  onSearchChange,
  onTopicChange,
  onSortChange,
}) => {
  const t = useTranslations('documents');

  return (
    <section aria-label="Класическа търсачка и филтри за документи" className="space-y-3">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Търси в документите по заглавие, служба или OCR текст"
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 pl-11 pr-4 py-3 text-base md:text-sm text-white placeholder-zinc-500 focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/80 focus:outline-none transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-zinc-400 shrink-0" aria-hidden="true" />
          <select
            aria-label="Сортиране на документите"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as DocumentSortMode)}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-3 text-base md:text-xs font-mono font-semibold text-zinc-200 focus:border-cyan-500 focus:outline-none transition-colors"
          >
            <option value="doc_date_desc">Дата от документа (най-нови)</option>
            <option value="doc_date_asc">Дата от документа (най-стари)</option>
            <option value="created_at_desc">Дата на качване (най-нови)</option>
            <option value="created_at_asc">Дата на качване (най-стари)</option>
            <option value="relevance">По релевантност в текста</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onTopicChange('')}
            aria-label="Покажи всички теми"
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              topicFilter === ''
                ? 'bg-linear-to-r from-cyan-500 to-indigo-600 text-white shadow-sm shadow-cyan-500/20'
                : 'border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            {t('allTopics', { count: totalCount })}
          </button>
          {DOCUMENT_TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => onTopicChange(topic)}
              aria-label={`Филтрирай по ${DOCUMENT_TOPIC_LABELS_BG[topic]}`}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                topicFilter === topic
                  ? 'bg-linear-to-r from-cyan-500 to-indigo-600 text-white shadow-sm shadow-cyan-500/20'
                  : 'border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              {DOCUMENT_TOPIC_LABELS_BG[topic]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
