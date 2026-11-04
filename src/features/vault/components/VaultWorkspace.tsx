'use client';

import React, { useMemo, useState } from 'react';
import {
  useVaultFactMutations,
  useVaultFactsQuery,
  useVaultSecretMutations,
  useVaultSecretsQuery,
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
  readonly initialFacts: readonly VaultFactItem[];
  readonly initialStepUpUnlocked: boolean;
}

export const VaultWorkspace: React.FC<VaultWorkspaceProps> = ({
  initialFacts,
  initialStepUpUnlocked,
}) => {
  const [activeTab, setActiveTab] = useState<'facts' | 'secrets'>('facts');
  const [isStepUpUnlocked, setIsStepUpUnlocked] = useState(initialStepUpUnlocked);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<VaultCategory | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFact, setEditingFact] = useState<VaultFactItem | null>(null);
  const [editingSecret, setEditingSecret] = useState<VaultSecretMaskedItem | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleStepUpExpired = () => {
    setIsStepUpUnlocked(false);
    setModalOpen(false);
  };

  const factsQuery = useVaultFactsQuery(initialFacts);
  const secretsQuery = useVaultSecretsQuery(
    activeTab === 'secrets' && isStepUpUnlocked,
    handleStepUpExpired
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
    if (!window.confirm(`Да се изтрие ли завинаги „${item.label}“ от KRONOS?`)) return;
    setDeletingId(item.id);
    try {
      await factMutations.deleteFact.mutateAsync(item.id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSecret = async (item: VaultSecretMaskedItem) => {
    if (!window.confirm(`Да се изтрие ли завинаги криптираната парола „${item.label}“?`)) return;
    setDeletingId(item.id);
    try {
      await secretMutations.deleteSecret.mutateAsync(item.id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section aria-label="Лични Данни и Пароли" className="space-y-6">
      <VaultFilterBar
        activeTab={activeTab}
        factsCount={factsQuery.data?.length ?? 0}
        canCreate={activeTab === 'facts' || isStepUpUnlocked}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        onTabChange={setActiveTab}
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
          isStepUpUnlocked={isStepUpUnlocked}
          items={filteredSecrets}
          isLoading={secretsQuery.isLoading}
          isDeletingId={deletingId}
          onUnlocked={() => {
            setIsStepUpUnlocked(true);
            void secretsQuery.refetch();
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
