'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  VAULT_CATEGORIES,
  type VaultCategory,
  type VaultFactItem,
  type VaultSecretMaskedItem,
} from '../schemas/vaultSchema';

export const CATEGORY_LABELS_BG: Record<VaultCategory, string> = {
  personal: 'Лични данни',
  tax: 'Данъци (Steuer)',
  bank: 'Банки & IBAN',
  family: 'Семейство & KiZ',
  housing: 'Жилище & Наем',
  health: 'Здраве & Каса',
  other: 'Други',
};

interface VaultItemModalProps {
  readonly mode: 'fact' | 'secret';
  readonly editingFact?: VaultFactItem | null;
  readonly editingSecret?: VaultSecretMaskedItem | null;
  readonly isSubmitting: boolean;
  readonly errorMessage: string | null;
  readonly onClose: () => void;
  readonly onSubmitFact: (payload: {
    readonly id?: string;
    readonly category: VaultCategory;
    readonly label: string;
    readonly value: string;
    readonly usernameOrHint: string | null;
  }) => Promise<void>;
  readonly onSubmitSecret: (payload: {
    readonly id?: string;
    readonly category: VaultCategory;
    readonly label: string;
    readonly secretValue: string;
    readonly usernameOrHint: string | null;
  }) => Promise<void>;
}

export const VaultItemModal: React.FC<VaultItemModalProps> = ({
  mode,
  editingFact,
  editingSecret,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmitFact,
  onSubmitSecret,
}) => {
  const isEditing = Boolean(editingFact || editingSecret);
  const [category, setCategory] = useState<VaultCategory>(
    editingFact?.category ?? editingSecret?.category ?? 'personal'
  );
  const [label, setLabel] = useState(editingFact?.label ?? editingSecret?.label ?? '');
  const [value, setValue] = useState(editingFact?.valuePlain ?? '');
  const [hint, setHint] = useState(
    editingFact?.usernameOrHint ?? editingSecret?.usernameOrHint ?? ''
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanHint = hint.trim() ? hint.trim() : null;
    if (mode === 'fact') {
      await onSubmitFact({
        id: editingFact?.id,
        category,
        label: label.trim(),
        value: value.trim(),
        usernameOrHint: cleanHint,
      });
    } else {
      await onSubmitSecret({
        id: editingSecret?.id,
        category,
        label: label.trim(),
        secretValue: value,
        usernameOrHint: cleanHint,
      });
    }
  };

  const title =
    mode === 'fact'
      ? isEditing
        ? 'Редакция на личен факт'
        : 'Добавяне на личен факт'
      : isEditing
        ? 'Редакция на криптирана парола'
        : 'Нова криптирана парола (AES-256-GCM)';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/85 backdrop-blur-md p-4"
    >
      <article className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <h2 className="text-base font-bold text-white tracking-wide">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Затвори прозореца"
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="vault-category" className="block text-xs font-mono text-zinc-400 mb-1.5">
              Категория
            </label>
            <select
              id="vault-category"
              aria-label="Избор на категория"
              value={category}
              onChange={(e) => setCategory(e.target.value as VaultCategory)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
            >
              {VAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS_BG[cat]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="vault-label" className="block text-xs font-mono text-zinc-400 mb-1.5">
              {mode === 'fact' ? 'Етикет (напр. Steuer-ID, IBAN, Kaltmiete)' : 'Портал / Услуга (напр. ELSTER, BundID)'}
            </label>
            <input
              id="vault-label"
              type="text"
              required
              aria-label="Етикет на записа"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={mode === 'fact' ? 'Steuer-ID' : 'BundID Портал'}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="vault-hint" className="block text-xs font-mono text-zinc-400 mb-1.5">
              {mode === 'fact' ? 'Бележка / Контекст (по избор)' : 'Потребителско име / Имейл (по избор)'}
            </label>
            <input
              id="vault-hint"
              type="text"
              aria-label="Потребителско име или бележка"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder={mode === 'fact' ? 'Напр. основна сметка в Sparkasse' : 'name@example.com'}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="vault-value" className="block text-xs font-mono text-zinc-400 mb-1.5">
              {mode === 'fact'
                ? 'Стойност'
                : isEditing
                  ? 'Нова парола (оставете празно, ако не я сменяте)'
                  : 'Парола / Тайна'}
            </label>
            <input
              id="vault-value"
              type={mode === 'secret' ? 'password' : 'text'}
              required={mode === 'fact' || !isEditing}
              aria-label="Стойност на записа"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={mode === 'fact' ? 'DE89 3704 0044...' : '••••••••••••'}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {errorMessage && (
            <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
              {errorMessage}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Откажи"
              className="rounded-xl border border-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-900"
            >
              Отказ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-label="Запази записа"
              className="rounded-xl bg-linear-to-r from-cyan-500 via-indigo-600 to-violet-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Записване...' : 'Запази'}
            </button>
          </div>
        </form>
      </article>
    </div>
  );
};
