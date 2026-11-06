'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createVaultFactAction,
  createVaultSecretAction,
  deleteVaultFactAction,
  deleteVaultSecretAction,
  fetchVaultFactsAction,
  fetchVaultSecretsAction,
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

export const VAULT_QUERY_KEYS = {
  facts: ['vault', 'facts'] as const,
  secrets: ['vault', 'secrets'] as const,
};

export const useVaultFactsQuery = (initialFacts?: readonly VaultFactItem[]) => {
  return useQuery({
    queryKey: VAULT_QUERY_KEYS.facts,
    queryFn: async () => {
      const res = await fetchVaultFactsAction();
      if (!res.ok) {
        throw new Error(res.errorMessage);
      }
      return res.data;
    },
    initialData: initialFacts,
  });
};

export const useVaultSecretsQuery = (enabled: boolean, onStepUpRequired: () => void) => {
  return useQuery({
    queryKey: VAULT_QUERY_KEYS.secrets,
    enabled,
    retry: false,
    queryFn: async () => {
      const res = await fetchVaultSecretsAction();
      if (!res.ok) {
        if (res.requiresStepUp) {
          onStepUpRequired();
        }
        throw new Error(res.errorMessage);
      }
      return res.data;
    },
  });
};

export const useVaultFactMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: VAULT_QUERY_KEYS.facts });
    await queryClient.invalidateQueries({ queryKey: ['assistant', 'workspace'] });
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
