'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useVaultFactMutations,
  useVaultFactsQuery,
  useVaultSecretMutations,
  useVaultSecretsQuery,
  VAULT_QUERY_KEYS,
} from '../hooks/useVaultQueries';
import type {
  VaultCategory,
  VaultFactItem,
  VaultSecretMaskedItem,
} from '../schemas/vaultSchema';
import { VaultFactsPanel } from './VaultFactsPanel';
import { VaultFilterBar } from './VaultFilterBar';
import { VaultItemModal } from './VaultItemModal';
import { VaultSecretsPanel } from './VaultSecretsPanel';

interface VaultWorkspaceProps {
  readonly initialFacts?: readonly VaultFactItem[];
  readonly initialLoadError?: string | null;
  readonly initialStepUpExpiresAtMs?: number | null;
  readonly isDemo?: boolean;
}

export const VaultWorkspace: React.FC<VaultWorkspaceProps> = ({
  initialFacts,
  initialLoadError = null,
  initialStepUpExpiresAtMs = null,
  isDemo = false,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'facts' | 'secrets'>('facts');
  const [stepUpExpiresAtMs, setStepUpExpiresAtMs] = useState<number | null>(
    initialStepUpExpiresAtMs
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<VaultCategory | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFact, setEditingFact] = useState<VaultFactItem | null>(null);
  const [editingSecret, setEditingSecret] = useState<VaultSecretMaskedItem | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isStepUpUnlocked = stepUpExpiresAtMs !== null;

  const handleStepUpExpired = useCallback(() => {
    setStepUpExpiresAtMs(null);
    setModalOpen(false);
    queryClient.removeQueries({ queryKey: VAULT_QUERY_KEYS.secrets });
  }, [queryClient]);

  useEffect(() => {
    if (stepUpExpiresAtMs === null) return;

    const checkExpiry = () => {
      if (Date.now() >= stepUpExpiresAtMs) {
        handleStepUpExpired();
      }
    };

    const remainingMs = Math.max(0, stepUpExpiresAtMs - Date.now());
    const timer = window.setTimeout(handleStepUpExpired, remainingMs);
    document.addEventListener('visibilitychange', checkExpiry);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', checkExpiry);
    };
  }, [stepUpExpiresAtMs, handleStepUpExpired]);

  const factsQuery = useVaultFactsQuery(initialFacts, isDemo);
  const secretsQuery = useVaultSecretsQuery(
    activeTab === 'secrets' && isStepUpUnlocked,
    handleStepUpExpired,
    isDemo
  );
  const factMutations = useVaultFactMutations();
  const secretMutations = useVaultSecretMutations(handleStepUpExpired);

  const filteredFacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (factsQuery.data ?? []).filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.valuePlain.toLowerCase().includes(q) ||
        (item.usernameOrHint?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [factsQuery.data, searchQuery, selectedCategory]);

  const filteredSecrets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (secretsQuery.data ?? []).filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        (item.usernameOrHint?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [secretsQuery.data, searchQuery, selectedCategory]);

  const handleDeleteFact = async (item: VaultFactItem) => {
    if (isDemo) {
      setDeleteError('В демо режим изтриването на факти е симулирано и блокирано за сигурност.');
      return;
    }
    if (!window.confirm(`Да се изтрие ли завинаги „${item.label}“ от KRONOS?`)) return;
    setDeleteError(null);
    setDeletingId(item.id);
    try {
      await factMutations.deleteFact.mutateAsync(item.id);
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? `${err.message} Записът остава в сейфа.`
          : 'Неуспешно изтриване. Записът остава в сейфа.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSecret = async (item: VaultSecretMaskedItem) => {
    if (isDemo) {
      setDeleteError('В демо режим изтриването на пароли е симулирано и блокирано за сигурност.');
      return;
    }
    if (!window.confirm(`Да се изтрие ли завинаги криптираната парола „${item.label}“?`)) return;
    setDeleteError(null);
    setDeletingId(item.id);
    try {
      await secretMutations.deleteSecret.mutateAsync(item.id);
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? `${err.message} Записът остава в сейфа.`
          : 'Неуспешно изтриване на паролата. Записът остава в сейфа.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const factsLoadError =
    factsQuery.error?.message ?? (factsQuery.data === undefined ? initialLoadError : null);

  return (
    <section aria-label="Лични Данни и Пароли" className="space-y-6">
      <div inert={modalOpen} className="space-y-6">
        <VaultFilterBar
          activeTab={activeTab}
          factsCount={factsQuery.data?.length ?? 0}
          canCreate={activeTab === 'facts' || isStepUpUnlocked}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          onTabChange={(nextTab) => {
            setDeleteError(null);
            setActiveTab(nextTab);
          }}
          onSearchChange={setSearchQuery}
          onCategoryChange={setSelectedCategory}
          onOpenCreate={() => {
            setEditingFact(null);
            setEditingSecret(null);
            setModalError(null);
            setModalOpen(true);
          }}
        />

        {activeTab === 'facts' ? (
          <VaultFactsPanel
            items={filteredFacts}
            isLoading={factsQuery.isLoading}
            loadError={factsLoadError}
            deleteError={deleteError}
            isDeletingId={deletingId}
            onEdit={(fact) => {
              setEditingFact(fact);
              setEditingSecret(null);
              setModalError(null);
              setModalOpen(true);
            }}
            onDelete={(fact) => void handleDeleteFact(fact)}
          />
        ) : (
          <VaultSecretsPanel
            key={isStepUpUnlocked ? 'unlocked' : 'locked'}
            isStepUpUnlocked={isStepUpUnlocked}
            items={filteredSecrets}
            isLoading={secretsQuery.isLoading}
            loadError={secretsQuery.error?.message ?? null}
            deleteError={deleteError}
            isDeletingId={deletingId}
            onUnlocked={(expiresAtMs) => {
              setDeleteError(null);
              setStepUpExpiresAtMs(expiresAtMs);
            }}
            onReveal={(id) => secretMutations.revealSecret.mutateAsync(id)}
            onEdit={(secret) => {
              setEditingSecret(secret);
              setEditingFact(null);
              setModalError(null);
              setModalOpen(true);
            }}
            onDelete={(secret) => void handleDeleteSecret(secret)}
          />
        )}
      </div>

      {modalOpen && (
        <VaultItemModal
          mode={activeTab === 'facts' ? 'fact' : 'secret'}
          editingFact={editingFact}
          editingSecret={editingSecret}
          isSubmitting={
            factMutations.createFact.isPending ||
            factMutations.updateFact.isPending ||
            secretMutations.createSecret.isPending ||
            secretMutations.updateSecret.isPending
          }
          errorMessage={modalError}
          onClose={() => setModalOpen(false)}
          onSubmitFact={async (payload) => {
            if (isDemo) {
              setModalError('В демо режим добавянето и редакцията на факти са симулирани.');
              return;
            }
            setModalError(null);
            try {
              if (payload.id) {
                await factMutations.updateFact.mutateAsync({
                  id: payload.id,
                  category: payload.category,
                  label: payload.label,
                  value: payload.value,
                  usernameOrHint: payload.usernameOrHint,
                });
              } else {
                await factMutations.createFact.mutateAsync({
                  category: payload.category,
                  label: payload.label,
                  value: payload.value,
                  usernameOrHint: payload.usernameOrHint,
                });
              }
              setModalOpen(false);
            } catch (err) {
              setModalError(err instanceof Error ? err.message : 'Грешка при запис.');
            }
          }}
          onSubmitSecret={async (payload) => {
            if (isDemo) {
              setModalError('В демо режим добавянето и редакцията на пароли са симулирани.');
              return;
            }
            setModalError(null);
            try {
              if (payload.id) {
                await secretMutations.updateSecret.mutateAsync({
                  id: payload.id,
                  category: payload.category,
                  label: payload.label,
                  secretValue: payload.secretValue || undefined,
                  usernameOrHint: payload.usernameOrHint,
                });
              } else {
                await secretMutations.createSecret.mutateAsync({
                  category: payload.category,
                  label: payload.label,
                  secretValue: payload.secretValue,
                  usernameOrHint: payload.usernameOrHint,
                });
              }
              setModalOpen(false);
            } catch (err) {
              setModalError(err instanceof Error ? err.message : 'Грешка при запис на парола.');
            }
          }}
        />
      )}
    </section>
  );
};
