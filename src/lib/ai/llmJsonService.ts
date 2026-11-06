import 'server-only';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import type { z } from 'zod';
import { getAiModelsConfig } from '@/config/aiModelsConfig';
import { createOpenRouterModel } from './openRouterGraphConfig';

export type LlmTextInvoker = (
  system: string,
  user: string,
  options: { readonly model: string; readonly temperature: number; readonly timeoutMs: number }
) => Promise<string>;

const DEFAULT_TIMEOUT_MS = 20_000;

const messageContentToText = (content: unknown): string => {
  if (typeof content === 'string') {
    return content;
  }
  if (!Array.isArray(content)) {
    return '';
  }
  return content
    .map((part: unknown) => {
      if (part && typeof part === 'object' && 'text' in part) {
        const text = (part as { readonly text?: unknown }).text;
        return typeof text === 'string' ? text : '';
      }
      return '';
    })
    .join('');
};

export const invokeOpenRouterText: LlmTextInvoker = async (system, user, options) => {
  const model = createOpenRouterModel(options.model, options.temperature);
  const response = await model.invoke(
    [new SystemMessage(system), new HumanMessage(user)],
    { signal: AbortSignal.timeout(options.timeoutMs) }
  );
  return messageContentToText(response.content);
};

export const extractJsonObjectText = (rawText: string): string => {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error('AI моделът не върна JSON обект.');
  }
  return cleaned.slice(start, end + 1);
};

export interface JsonModelCallOptions<T> {
  readonly schema: z.ZodType<T>;
  readonly system: string;
  readonly user: string;
  readonly model?: string;
  readonly temperature?: number;
  readonly timeoutMs?: number;
  readonly invoker?: LlmTextInvoker;
}

export const callJsonModel = async <T>(options: JsonModelCallOptions<T>): Promise<T> => {
  const invoker = options.invoker ?? invokeOpenRouterText;
  const raw = await invoker(options.system, options.user, {
    model: options.model ?? getAiModelsConfig().chatFast,
    temperature: options.temperature ?? 0.1,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });

  const parsedJson: unknown = JSON.parse(extractJsonObjectText(raw));
  const validated = options.schema.safeParse(parsedJson);
  if (!validated.success) {
    throw new Error('Невалидна структура на отговора от AI модела.');
  }
  return validated.data;
};
