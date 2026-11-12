'use client';

import React, { useState } from 'react';
import { Check, Copy, Eye, EyeOff, LockKeyhole, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import type { VaultSecretMaskedItem } from '../schemas/vaultSchema';
import { CATEGORY_LABELS_BG } from './VaultItemModal';

const DEFAULT_STEP_UP_TTL_MS = 5 * 60 * 1000;

interface VaultSecretsPanelProps {
  readonly isStepUpUnlocked: boolean;
  readonly items: readonly VaultSecretMaskedItem[];
  readonly isLoading: boolean;
  readonly loadError: string | null;
  readonly deleteError?: string | null;
  readonly isDeletingId: string | null;
  readonly onUnlocked: (expiresAtMs: number) => void;
  readonly onReveal: (id: string) => Promise<string>;
  readonly onEdit: (item: VaultSecretMaskedItem) => void;
  readonly onDelete: (item: VaultSecretMaskedItem) => void;
}

export const VaultSecretsPanel: React.FC<VaultSecretsPanelProps> = ({
  isStepUpUnlocked,
  items,
  isLoading,
  loadError,
  deleteError = null,
  isDeletingId,
  onUnlocked,
  onReveal,
  onEdit,
  onDelete,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [revealedMap, setRevealedMap] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const submitStepUpPin = async (digits: string) => {
    setIsVerifyingPin(true);
    setPinError(null);
    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: digits, isStepUp: true }),
      });
      const data = (await res.json()) as {
        readonly ok?: boolean;
        readonly errorMessage?: string;
        readonly data?: { readonly expiresAtMs?: number };
      };
      if (!res.ok || !data.ok) {
        setPinInput('');
        setPinError(data.errorMessage ?? 'Невалиден ПИН код за отключване.');
        return;
      }
      setPinInput('');
      onUnlocked(data.data?.expiresAtMs ?? Date.now() + DEFAULT_STEP_UP_TTL_MS);
    } catch {
      setPinInput('');
      setPinError('Грешка при проверка на 4-цифрения ПИН код.');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handlePinChange = (rawVal: string) => {
    const clean = rawVal.replace(/\D/g, '').slice(0, 4);
    setPinInput(clean);
    if (clean.length === 4) {
      void submitStepUpPin(clean);
    }
  };

  const handleToggleReveal = async (id: string) => {
    if (revealedMap[id]) {
      setRevealedMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    try {
      const plain = await onReveal(id);
      setRevealedMap((prev) => ({ ...prev, [id]: plain }));
      window.setTimeout(() => {
        setRevealedMap((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 30_000);
    } catch {
      // Step-up expired
    }
  };

  const handleCopySecret = async (id: string) => {
    try {
      const plain = await onReveal(id);
      await navigator.clipboard.writeText(plain);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 2000);
    } catch {
      // Upstream handled
    }
  };

  if (!isStepUpUnlocked) {
    return (
      <article className="mx-auto max-w-md rounded-3xl border border-zinc-800 bg-zinc-950/80 p-8 text-center shadow-2xl backdrop-blur-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 border border-violet-500/25 text-violet-400 mb-4 shadow-lg shadow-violet-500/10">
          <LockKeyhole className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-wide">
          Step-Up ПИН Потвърждение
        </h2>
        <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
          Паролите са криптирани с AES-256-GCM. Въведете вашия 4-цифрен ПИН за 5-минутен защитен достъп.
        </p>

        <div className="mt-6">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            autoFocus
            disabled={isVerifyingPin}
            value={pinInput}
            onChange={(e) => handlePinChange(e.target.value)}
            aria-label="Въведете 4-цифрен Step-Up ПИН код"
            placeholder="••••"
            className="w-44 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-2xl tracking-[0.6em] font-mono font-bold text-cyan-400 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {pinError && (
          <p role="alert" className="mt-3 text-xs font-medium text-rose-400">
            {pinError}
          </p>
        )}
      </article>
    );
  }

  if (isLoading) {
    return <p className="text-sm font-mono text-zinc-500 py-6">Зареждане на криптираните тайни...</p>;
  }

  if (loadError) {
    return (
      <p
        role="alert"
        className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-300"
      >
        {loadError}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-3">
        {deleteError && (
          <p
            role="alert"
            className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-300"
          >
            {deleteError}
          </p>
        )}
        <article className="rounded-3xl border border-zinc-850 bg-zinc-950/60 p-8 text-center backdrop-blur-xl">
          <p className="text-sm font-mono text-zinc-500">
            Секцията с пароли е отключена. Натиснете „Добави парола“, за да запазите първия AES-256-GCM запис.
          </p>
        </article>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2 text-xs font-mono text-emerald-300">
        <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>STEP-UP СЕСИЯТА Е АКТИВНА (5 МИН). AES-256-GCM КРИПТИРАНЕ.</span>
      </div>

      {deleteError && (
        <p
          role="alert"
          className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-300"
        >
          {deleteError}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => {
          const revealed = revealedMap[item.id];
          const isCopied = copiedId === item.id;
          return (
            <article
              key={item.id}
              className="rounded-2xl border border-zinc-850 bg-zinc-950/70 p-5 shadow-lg backdrop-blur-xl hover:border-zinc-750 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex rounded-md bg-violet-500/15 border border-violet-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-violet-300">
                  {CATEGORY_LABELS_BG[item.category]}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    aria-label={`Редактирай парола за ${item.label}`}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingId === item.id}
                    onClick={() => onDelete(item)}
                    aria-label={`Изтрий парола за ${item.label}`}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/15 hover:text-rose-400 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <h3 className="mt-2.5 text-sm font-bold text-white tracking-wide">{item.label}</h3>
              {item.usernameOrHint && (
                <p className="mt-0.5 text-xs text-zinc-400">{item.usernameOrHint}</p>
              )}

              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2.5">
                <code className="text-sm font-mono font-bold text-cyan-300 break-all">
                  {revealed ?? '••••••••••••••'}
                </code>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleToggleReveal(item.id)}
                    aria-label={revealed ? `Скрий парола за ${item.label}` : `Покажи парола за ${item.label}`}
                    className="rounded-lg bg-zinc-800 p-1.5 text-zinc-300 hover:text-white"
                  >
                    {revealed ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4 text-cyan-400" aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopySecret(item.id)}
                    aria-label={`Копирай парола за ${item.label}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-cyan-500 hover:text-zinc-950 active:scale-95 transition-all"
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                    <span>{isCopied ? 'Копирано' : 'Копирай'}</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
