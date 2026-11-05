'use client';

import React, { useMemo, useState } from 'react';
import { Check, Copy, Eye, EyeOff, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import {
  useVaultSecretMutations,
  useVaultSecretsQuery,
  type VaultSecretMaskedItem,
} from '@/features/vault';
import { ChatStepUpPinPrompt } from './ChatStepUpPinPrompt';

interface ChatSecretsGateCardProps {
  readonly initialMode: 'browse' | 'create';
  readonly searchHint: string | null;
}

export const ChatSecretsGateCard: React.FC<ChatSecretsGateCardProps> = ({
  initialMode,
  searchHint,
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(initialMode === 'create');
  const [label, setLabel] = useState(searchHint ?? '');
  const [hint, setHint] = useState('');
  const [secretVal, setSecretVal] = useState('');
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [revealedMap, setRevealedMap] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleLock = () => {
    setIsUnlocked(false);
    setRevealedMap({});
  };

  const secretsQuery = useVaultSecretsQuery(isUnlocked, handleLock);
  const secretMutations = useVaultSecretMutations(handleLock);

  const filteredItems = useMemo((): readonly VaultSecretMaskedItem[] => {
    const all = secretsQuery.data ?? [];
    const q = (searchHint ?? '').trim().toLowerCase();
    if (!q || initialMode === 'create') return all;
    const matched = all.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.usernameOrHint?.toLowerCase().includes(q) ?? false)
    );
    return matched.length > 0 ? matched : all;
  }, [initialMode, searchHint, secretsQuery.data]);

  const handleCreateSecret = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormMsg(null);
    try {
      await secretMutations.createSecret.mutateAsync({
        category: 'other',
        label: label.trim(),
        secretValue: secretVal,
        usernameOrHint: hint.trim() || null,
      });
      setSecretVal('');
      setHint('');
      setShowCreateForm(false);
      setFormMsg('Криптираната парола е записана успешно с AES-256-GCM.');
    } catch (err) {
      setFormMsg(err instanceof Error ? err.message : 'Грешка при запис на парола.');
    }
  };

  const handleCopy = async (id: string) => {
    try {
      const plain = await secretMutations.revealSecret.mutateAsync(id);
      await navigator.clipboard.writeText(plain);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
    } catch {
      // Handled by hook
    }
  };

  const handleToggleReveal = async (id: string) => {
    if (revealedMap[id]) {
      setRevealedMap((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      return;
    }
    try {
      const plain = await secretMutations.revealSecret.mutateAsync(id);
      setRevealedMap((prev) => ({ ...prev, [id]: plain }));
    } catch {
      // Handled by hook
    }
  };

  if (!isUnlocked) {
    return <ChatStepUpPinPrompt onUnlocked={() => setIsUnlocked(true)} />;
  }

  return (
    <article className="mt-3 rounded-2xl border border-emerald-500/30 bg-zinc-950/90 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-300">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>AES-256-GCM СЕКЦИЯТА Е ОТКЛЮЧЕНА</span>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          aria-label="Добави нова парола"
          className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Нова парола</span>
        </button>
      </div>

      {formMsg && <p className="text-xs text-cyan-300">{formMsg}</p>}

      {showCreateForm && (
        <form onSubmit={(e) => void handleCreateSecret(e)} className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <input
            type="text"
            required
            aria-label="Услуга или сайт за паролата"
            placeholder="Услуга / Портал (напр. Elster)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-base md:text-xs text-white focus:border-cyan-500 focus:outline-none"
          />
          <input
            type="text"
            aria-label="Потребителско име или бележка"
            placeholder="Потребител / Имейл (по избор)"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-base md:text-xs text-white focus:border-cyan-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <input
              type="password"
              required
              aria-label="Стойност на паролата"
              placeholder="Парола..."
              value={secretVal}
              onChange={(e) => setSecretVal(e.target.value)}
              className="flex-1 min-w-0 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-base md:text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={secretMutations.createSecret.isPending}
              aria-label="Запази криптираната парола"
              className="rounded-xl bg-cyan-500 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              Запази
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{item.label}</p>
              {item.usernameOrHint && (
                <p className="text-[11px] text-zinc-400 truncate">{item.usernameOrHint}</p>
              )}
              <code className="text-xs font-mono text-cyan-300">
                {revealedMap[item.id] ?? '••••••••••••'}
              </code>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void handleToggleReveal(item.id)}
                aria-label={`Покажи или скрий парола за ${item.label}`}
                className="rounded-lg bg-zinc-800 p-1.5 text-zinc-300 hover:text-white"
              >
                {revealedMap[item.id] ? (
                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Eye className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={() => void handleCopy(item.id)}
                aria-label={`Копирай парола за ${item.label}`}
                className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:bg-cyan-500 hover:text-zinc-950"
              >
                {copiedId === item.id ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{copiedId === item.id ? 'Копирано' : 'Копирай'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Да се изтрие ли завинаги паролата „${item.label}“?`)) {
                    void secretMutations.deleteSecret.mutateAsync(item.id);
                  }
                }}
                aria-label={`Изтрий парола за ${item.label}`}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/15 hover:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
};
