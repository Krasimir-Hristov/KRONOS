import { describe, expect, it } from 'vitest';
import { parseServerEnv } from '@/config/envConfig';
import {
  EMBEDDING_DIMENSIONS,
  getAiModelsConfig,
  JEV_TIMEOUT_MS,
  LANGGRAPH_MAX_STEPS,
  OPENROUTER_ENDPOINTS,
} from '@/config/aiModelsConfig';

describe('envConfig & aiModelsConfig', () => {
  it('applies safe defaults when optional server env vars are omitted', () => {
    const result = parseServerEnv({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
      expect(result.data.SUPABASE_STORAGE_BUCKET).toBe('kronos-vault');
    }
  });

  it('rejects KRONOS_PIN_SECRET or KRONOS_VAULT_ENCRYPTION_KEY shorter than 32 characters', () => {
    expect(
      parseServerEnv({
        KRONOS_PIN_SECRET: 'too-short-secret',
      }).ok
    ).toBe(false);

    expect(
      parseServerEnv({
        KRONOS_VAULT_ENCRYPTION_KEY: 'short-vault-key',
      }).ok
    ).toBe(false);
  });

  it('exposes canonical OpenRouter endpoints, safety caps, and model overrides', () => {
    expect(OPENROUTER_ENDPOINTS.decisions).toBe('https://openrouter.ai/api/alpha/decisions');
    expect(EMBEDDING_DIMENSIONS).toBe(1536);
    expect(JEV_TIMEOUT_MS).toBe(1500);
    expect(LANGGRAPH_MAX_STEPS).toBe(4);

    const defaults = getAiModelsConfig({});
    expect(defaults.jevDispatcher).toBe('typesafe/jev-latest');
    expect(defaults.imageFast).toBe('google/gemini-3.1-flash-image');
    expect(defaults.imagePro).toBe('google/gemini-3-pro-image');

    const overridden = getAiModelsConfig({
      OPENROUTER_JEV_MODEL: 'typesafe/jev-1.14',
    });
    expect(overridden.jevDispatcher).toBe('typesafe/jev-1.14');
  });
});
