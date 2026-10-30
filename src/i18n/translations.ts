import { z } from 'zod';
import { bgDictionary, type TranslationDictionary } from '@/i18n/bgDictionary';
import { elDictionary } from '@/i18n/elDictionary';

export const supportedLocaleSchema = z.enum(['bg', 'el']);

export type SupportedLocale = z.infer<typeof supportedLocaleSchema>;

const dictionaries: Record<SupportedLocale, TranslationDictionary> = {
  bg: bgDictionary,
  el: elDictionary,
};

export const getDictionary = (locale: SupportedLocale): TranslationDictionary => {
  return dictionaries[locale];
};

export const parseLocale = (rawLocale: unknown): SupportedLocale => {
  const parsed = supportedLocaleSchema.safeParse(rawLocale);
  return parsed.success ? parsed.data : 'bg';
};
