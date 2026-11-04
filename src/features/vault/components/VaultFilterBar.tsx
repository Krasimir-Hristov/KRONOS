'use client';

import React from 'react';
import { KeySquare, Plus, Search, ShieldCheck } from 'lucide-react';
import { VAULT_CATEGORIES, type VaultCategory } from '../schemas/vaultSchema';
import { CATEGORY_LABELS_BG } from './VaultItemModal';

interface VaultFilterBarProps {
  readonly activeTab: 'facts' | 'secrets';
  readonly factsCount: number;
  readonly canCreate: boolean;
  readonly searchQuery: string;
  readonly selectedCategory: VaultCategory | 'all';
  readonly onTabChange: (tab: 'facts' | 'secrets') => void;
  readonly onSearchChange: (query: string) => void;
  readonly onCategoryChange: (cat: VaultCategory | 'all') => void;
  readonly onOpenCreate: () => void;
}

export const VaultFilterBar: React.FC<VaultFilterBarProps> = ({
  activeTab,
  factsCount,
  canCreate,
  searchQuery,
  selectedCategory,
  onTabChange,
  onSearchChange,
  onCategoryChange,
  onOpenCreate,
}) => {
  return (
    <div className="space-y-4">
      <header className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-400">
              VAULT ENGINE
            </span>
            <span className="text-xs font-mono text-zinc-500">• AES-256-GCM</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Лични Данни & Криптирани Пароли
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-zinc-400">
            1-клик копиране на Steuer-ID, IBAN, Kaltmiete и защитени пароли със Step-Up ПИН.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={onOpenCreate}
            aria-label={activeTab === 'facts' ? 'Добави нов факт' : 'Добави нова парола'}
            className="relative inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-500 via-indigo-600 to-violet-600 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{activeTab === 'facts' ? 'Добави факт' : 'Добави парола'}</span>
          </button>
        )}
      </header>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <nav
          aria-label="Секции на сейфа за данни"
          className="inline-flex rounded-2xl border border-zinc-800 bg-zinc-900/90 p-1 backdrop-blur-xl"
        >
          <button
            type="button"
            onClick={() => onTabChange('facts')}
            aria-label="Покажи извлечени факти и данни"
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'facts'
                ? 'bg-linear-to-r from-cyan-500 via-indigo-600 to-violet-600 text-white shadow-md shadow-cyan-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>Извлечени Факти ({factsCount})</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('secrets')}
            aria-label="Покажи криптирани пароли и тайни"
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'secrets'
                ? 'bg-linear-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-violet-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <KeySquare className="h-4 w-4" aria-hidden="true" />
            <span>🔐 Пароли & Тайни</span>
          </button>
        </nav>

        <div className="relative flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Търсене в данни и пароли"
            placeholder="Търси по етикет, IBAN, Steuer-ID..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onCategoryChange('all')}
          aria-label="Всички категории"
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
            selectedCategory === 'all'
              ? 'bg-linear-to-r from-cyan-500 to-indigo-600 text-white shadow-sm shadow-cyan-500/20'
              : 'bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
          }`}
        >
          Всички
        </button>
        {VAULT_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onCategoryChange(cat)}
            aria-label={`Филтрирай по ${CATEGORY_LABELS_BG[cat]}`}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              selectedCategory === cat
                ? 'bg-linear-to-r from-cyan-500 to-indigo-600 text-white shadow-sm shadow-cyan-500/20'
                : 'bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
            }`}
          >
            {CATEGORY_LABELS_BG[cat]}
          </button>
        ))}
      </div>
    </div>
  );
};
