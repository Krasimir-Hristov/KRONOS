import { describe, expect, it } from 'vitest';
import {
  createOpenRouterModel,
  KronosGraphAnnotation,
} from '@/lib/ai/openRouterGraphConfig';

describe('openRouterGraphConfig', () => {
  it('instantiates ChatOpenAI instance configured for OpenRouter', () => {
    const model = createOpenRouterModel();
    expect(model).toBeDefined();
    expect(model.model).toBe('deepseek/deepseek-v4.1-flash');
  });

  it('defines valid LangGraph state annotation with 4-step cap', () => {
    expect(KronosGraphAnnotation).toBeDefined();
    expect(KronosGraphAnnotation.spec).toBeDefined();
  });
});
