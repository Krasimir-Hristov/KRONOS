'use client';

import React, { useState } from 'react';
import type {
  VaultCategory,
  VaultSecretInput,
  VaultSecretMaskedItem,
  VaultSecretUpdateInput,
} from '@/features/vault';

interface ChatSecretFormProps {
  readonly mode: 'create' | 'edit';
  readonly defaultLabel: string;
  readonly editingItem: VaultSecretMaskedItem | null;
  readonly isPending: boolean;
  readonly onCreate: (input: VaultSecretInput) => Promise<void>;
  readonly onUpdate: (input: VaultSecretUpdateInput) => Promise<void>;
  readonly onCancel: () => void;
}

export const ChatSecretForm: React.FC<ChatSecretFormProps> = ({
  mode,
  defaultLabel,
  editingItem,
  isPending,
  onCreate,
  onUpdate,
  onCancel,
}) => {
  const [label, setLabel] = useState(
    mode === 'edit' && editingItem ? editingItem.label : defaultLabel
  );
  const [hint, setHint] = useState(
    mode === 'edit' && editingItem ? (editingItem.usernameOrHint ?? '') : ''
  );
  const [secretVal, setSecretVal] = useState('');
  const category: VaultCategory =
    mode === 'edit' && editingItem ? editingItem.category : 'other';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (mode === 'edit' && editingItem) {
      await onUpdate({
        id: editingItem.id,
        category,
        label: label.trim(),
        usernameOrHint: hint.trim() || null,
        secretValue: secretVal,
      });
      setSecretVal('');
      return;
    }

    await onCreate({
      category: 'other',
      label: label.trim(),
      secretValue: secretVal,
      usernameOrHint: hint.trim() || null,
    });
    setSecretVal('');
    setHint('');
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-xl border border-cyan-500/25 bg-zinc-900/70 p-3 space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono font-bold text-cyan-300">
          {mode === 'edit' && editingItem
            ? `ПРОМЯНА НА ПАРОЛА: ${editingItem.label}`
            : 'НОВА КРИПТИРАНА ПАРОЛА'}
        </span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Затвори формата за парола"
          className="text-[11px] font-mono text-zinc-400 hover:text-white"
        >
          Отказ
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="text"
          required
          aria-label="Услуга или сайт за паролата"
          placeholder="Услуга / Портал (напр. Elster)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-base md:text-xs text-white focus:border-cyan-500 focus:outline-none"
        />
        <input
          type="text"
          aria-label="Потребителско име или бележка"
          placeholder="Потребител / Имейл (по избор)"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-base md:text-xs text-white focus:border-cyan-500 focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            type="password"
            required={mode === 'create'}
            aria-label="Стойност на паролата"
            placeholder={mode === 'edit' ? 'Нова парола...' : 'Парола...'}
            value={secretVal}
            onChange={(e) => setSecretVal(e.target.value)}
            className="flex-1 min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-base md:text-xs text-white focus:border-cyan-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isPending}
            aria-label="Запази криптираната парола"
            className="rounded-xl bg-cyan-500 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {mode === 'edit' ? 'Обнови' : 'Запази'}
          </button>
        </div>
      </div>
    </form>
  );
};
