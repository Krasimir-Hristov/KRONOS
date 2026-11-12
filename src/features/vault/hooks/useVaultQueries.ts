'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createVaultFactAction,
  createVaultSecretAction,
  deleteVaultFactAction,
  deleteVaultSecretAction,
  revealVaultSecretAction,
  updateVaultFactAction,
  updateVaultSecretAction,
} from '../dal/vaultActions';
import type {
  VaultFactInput,
  VaultFactItem,
  VaultFactUpdateInput,
  VaultSecretInput,
  VaultSecretUpdateInput,
} from '../schemas/vaultSchema';
import { MOCK_VAULT_FACTS, MOCK_VAULT_SECRETS } from '../utils/mockVaultFacts';

export const VAULT_QUERY_KEYS = {
  facts: ['vault', 'facts'] as const,
  secrets: ['vault', 'secrets'] as const,
};

export const useVaultFactsQuery = (
  initialFacts: readonly VaultFactItem[] = MOCK_VAULT_FACTS
) => {
  return useQuery({
    queryKey: VAULT_QUERY_KEYS.facts,
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async () => initialFacts,
    initialData: initialFacts,
  });
};

export const useVaultSecretsQuery = (enabled: boolean, _onStepUpRequired: () => void) => {
  return useQuery({
    queryKey: VAULT_QUERY_KEYS.secrets,
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
    queryFn: async () => MOCK_VAULT_SECRETS,
    initialData: MOCK_VAULT_SECRETS,
  });
};

export const useVaultFactMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: VAULT_QUERY_KEYS.facts });
  };

  const createFact = useMutation({
    mutationFn: async (input: VaultFactInput) => {
      const res = await createVaultFactAction(input);
      if (!res.ok) throw new Error(res.errorMessage);
      return res.data;
    },
    onSuccess: invalidate,
  });

  const updateFact = useMutation({
    mutationFn: async (input: VaultFactUpdateInput) => {
      const res = await updateVaultFactAction(input);
      if (!res.ok) throw new Error(res.errorMessage);
    },
    onSuccess: invalidate,
  });

  const deleteFact = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteVaultFactAction({ id });
      if (!res.ok) throw new Error(res.errorMessage);
    },
    onSuccess: invalidate,
  });

  return { createFact, updateFact, deleteFact };
};

export const useVaultSecretMutations = (onStepUpRequired: () => void) => {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: VAULT_QUERY_KEYS.secrets });

  const createSecret = useMutation({
    mutationFn: async (input: VaultSecretInput) => {
      const res = await createVaultSecretAction(input);
      if (!res.ok) {
        if (res.requiresStepUp) onStepUpRequired();
        throw new Error(res.errorMessage);
      }
      return res.data;
    },
    onSuccess: invalidate,
  });

  const updateSecret = useMutation({
    mutationFn: async (input: VaultSecretUpdateInput) => {
      const res = await updateVaultSecretAction(input);
      if (!res.ok) {
        if (res.requiresStepUp) onStepUpRequired();
        throw new Error(res.errorMessage);
      }
    },
    onSuccess: invalidate,
  });

  const deleteSecret = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteVaultSecretAction({ id });
      if (!res.ok) {
        if (res.requiresStepUp) onStepUpRequired();
        throw new Error(res.errorMessage);
      }
    },
    onSuccess: invalidate,
  });

  const revealSecret = useMutation({
    mutationFn: async (id: string) => {
      if (id.startsWith('00000000-0000-4000-8000-0000000004')) {
        return 'Kronos#MockSecret2026!';
      }
      const res = await revealVaultSecretAction({ id });
      if (!res.ok) {
        if (res.requiresStepUp) onStepUpRequired();
        throw new Error(res.errorMessage);
      }
      return res.data.plainSecret;
    },
  });

  return { createSecret, updateSecret, deleteSecret, revealSecret };
};
