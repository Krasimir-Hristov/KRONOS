import { z } from 'zod';

export const OPENROUTER_ENDPOINTS = {
  decisions: 'https://openrouter.ai/api/alpha/decisions',
  chatBaseUrl: 'https://openrouter.ai/api/v1',
  audioTranscriptions: 'https://openrouter.ai/api/v1/audio/transcriptions',
  audioSpeech: 'https://openrouter.ai/api/v1/audio/speech',
} as const;

export const EMBEDDING_DIMENSIONS = 1536 as const;
export const JEV_TIMEOUT_MS = 1500 as const;
export const LANGGRAPH_MAX_STEPS = 4 as const;

const aiModelsSchema = z.object({
  jevDispatcher: z.string().min(1).default('typesafe/jev-latest'),
  chatFast: z.string().min(1).default('deepseek/deepseek-v4.1-flash'),
  chatPro: z.string().min(1).default('google/gemini-3.8-pro'),
  visionOcr: z.string().min(1).default('google/gemini-3.8-flash'),
  imageFast: z.string().min(1).default('google/gemini-3.1-flash-image'),
  imagePro: z.string().min(1).default('google/gemini-3-pro-image'),
  embedding: z.string().min(1).default('openai/text-embedding-3-small'),
  sttWhisper: z.string().min(1).default('openai/whisper-large-v3'),
  ttsSpeech: z.string().min(1).default('openai/gpt-4o-mini-tts'),
});

export type AiModelsConfig = z.infer<typeof aiModelsSchema>;

export const getAiModelsConfig = (
  rawEnv: Record<string, string | undefined> = process.env
): AiModelsConfig => {
  try {
    const parsed = aiModelsSchema.safeParse({
      jevDispatcher: rawEnv.OPENROUTER_JEV_MODEL,
      chatFast: rawEnv.OPENROUTER_CHAT_FAST_MODEL,
      chatPro: rawEnv.OPENROUTER_CHAT_PRO_MODEL,
      visionOcr: rawEnv.OPENROUTER_VISION_OCR_MODEL,
      imageFast: rawEnv.OPENROUTER_IMAGE_FAST_MODEL,
      imagePro: rawEnv.OPENROUTER_IMAGE_PRO_MODEL,
      embedding: rawEnv.OPENROUTER_EMBEDDING_MODEL,
      sttWhisper: rawEnv.OPENROUTER_STT_MODEL,
      ttsSpeech: rawEnv.OPENROUTER_TTS_MODEL,
    });

    if (parsed.success) {
      return parsed.data;
    }
    return aiModelsSchema.parse({});
  } catch {
    return aiModelsSchema.parse({});
  }
};
