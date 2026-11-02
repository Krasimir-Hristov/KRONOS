import { ChatOpenAI } from '@langchain/openai';
import { Annotation } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import {
  getAiModelsConfig,
  LANGGRAPH_MAX_STEPS,
  OPENROUTER_ENDPOINTS,
} from '@/config/aiModelsConfig';

export const KronosGraphAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => prev.concat(next),
    default: () => [],
  }),
  routedDepartment: Annotation<string>({
    reducer: (_, next) => next,
    default: () => 'general',
  }),
  zone1DocumentIds: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  zone2DocumentIds: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  stepCount: Annotation<number>({
    reducer: (prev, next) => Math.min(prev + next, LANGGRAPH_MAX_STEPS),
    default: () => 0,
  }),
});

export type KronosGraphState = typeof KronosGraphAnnotation.State;

export const createOpenRouterModel = (
  modelName?: string,
  temperature = 0.2
): ChatOpenAI => {
  const models = getAiModelsConfig();
  const selectedModel = modelName ?? models.chatFast;
  const apiKey = process.env.OPENROUTER_API_KEY || 'dummy_test_key_openrouter';

  return new ChatOpenAI({
    model: selectedModel,
    temperature,
    apiKey,
    configuration: {
      baseURL: OPENROUTER_ENDPOINTS.chatBaseUrl,
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'KRONOS Assistant',
      },
    },
  });
};
