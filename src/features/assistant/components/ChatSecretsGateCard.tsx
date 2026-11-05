'use client';

import React, { useMemo, useState } from 'react';
import { Check, Copy, Eye, EyeOff, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import {
  useVaultSecretMutations,
  useVaultSecretsQuery,
  type VaultSecretInput,
  type VaultSecretMaskedItem,
  type VaultSecretUpdateInput,
} from '@/features/vault';
import { ChatSecretForm } from './ChatSecretForm';
import { ChatStepUpPinPrompt } from './ChatStepUpPinPrompt';

interface ChatSecretsGateCardProps {
  readonly initialMode: 'browse' | 'create' | 'edit';
  readonly searchHint: string | null;
}

export const ChatSecretsGateCard: React.FC<ChatSecretsGateCardProps> = ({
  initialMode,
  searchHint,
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showAllOverride, setShowAllOverride] = useState(false);
  const [formState, setFormState] = useState<
    | { readonly kind: 'closed' }
    | { readonly kind: 'create' }
    | { readonly kind: 'edit'; readonly item: VaultSecretMaskedItem }
  >(initialMode === 'create' ? { kind: 'create' } : { kind: 'closed' });
  const [dismissedAutoEdit, setDismissedAutoEdit] = useState(false);
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
    if (!q || initialMode === 'create' || showAllOverride) return all;
    return all.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.usernameOrHint?.toLowerCase().includes(q) ?? false)
    );
  }, [initialMode, searchHint, secretsQuery.data, showAllOverride]);

  const activeFormState = useMemo(() => {
    if (formState.kind !== 'closed') {
      return formState;
    }
    if (
      initialMode === 'edit' &&
      !dismissedAutoEdit &&
      filteredItems.length === 1 &&
      filteredItems[0]
    ) {
      return { kind: 'edit' as const, item: filteredItems[0] };
    }
    return formState;
  }, [dismissedAutoEdit, filteredItems, formState, initialMode]);

  const handleCreateSecret = async (input: VaultSecretInput) => {
    setFormMsg(null);
    try {
      await secretMutations.createSecret.mutateAsync(input);
      setFormState({ kind: 'closed' });
      setFormMsg('Криптираната парола е записана успешно с AES-256-GCM.');
    } catch (err) {
      setFormMsg(err instanceof Error ? err.message : 'Грешка при запис на парола.');
    }
  };

  const handleUpdateSecret = async (input: VaultSecretUpdateInput) => {
    setFormMsg(null);
    try {
      await secretMutations.updateSecret.mutateAsync(input);
      setRevealedMap((prev) => {
        const next = { ...prev };
        delete next[input.id];
        return next;
      });
      setDismissedAutoEdit(true);
      setFormState({ kind: 'closed' });
      setFormMsg('Криптираната парола е обновена успешно с AES-256-GCM.');
    } catch (err) {
      setFormMsg(err instanceof Error ? err.message : 'Грешка при промяна на парола.');
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
          onClick={() => {
            setDismissedAutoEdit(true);
            setFormState((prev) =>
              prev.kind === 'create' ? { kind: 'closed' } : { kind: 'create' }
            );
          }}
          aria-label="Добави нова парола"
          className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Нова парола</span>
        </button>
      </div>

      {formMsg && <p className="text-xs text-cyan-300">{formMsg}</p>}

      {initialMode === 'edit' && filteredItems.length > 1 && activeFormState.kind === 'closed' && (
        <p className="text-xs text-amber-300">
          Изберете коя от намерените пароли желаете да обновите с бутона за редакция.
        </p>
      )}

      {activeFormState.kind !== 'closed' && (
        <ChatSecretForm
          key={activeFormState.kind === 'edit' ? activeFormState.item.id : 'create'}
          mode={activeFormState.kind}
          defaultLabel={searchHint ?? ''}
          editingItem={activeFormState.kind === 'edit' ? activeFormState.item : null}
          isPending={
            secretMutations.createSecret.isPending || secretMutations.updateSecret.isPending
          }
          onCreate={handleCreateSecret}
          onUpdate={handleUpdateSecret}
          onCancel={() => {
            setDismissedAutoEdit(true);
            setFormState({ kind: 'closed' });
          }}
        />
      )}

      {secretsQuery.isSuccess && filteredItems.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-400">
          <span>
            {searchHint
              ? `Няма намерена парола за „${searchHint}“.`
              : 'Няма запазени пароли в сейфа.'}
          </span>
          {searchHint && !showAllOverride && (secretsQuery.data?.length ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => setShowAllOverride(true)}
              aria-label="Покажи всички запазени пароли"
              className="font-mono font-semibold text-cyan-300 hover:text-cyan-200"
            >
              Покажи всички ({secretsQuery.data?.length ?? 0})
            </button>
          )}
        </div>
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
                  setDismissedAutoEdit(true);
                  setFormState({ kind: 'edit', item });
                }}
                aria-label={`Промени парола за ${item.label}`}
                className="rounded-lg bg-zinc-800 p-1.5 text-zinc-300 hover:text-cyan-300"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
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
