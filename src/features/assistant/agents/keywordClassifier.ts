import { isSuspectedSecretFact } from '@/lib/security/secretFactGuard';
import type {
  AssistantDepartment,
  AssistantIntent,
  ChatAttachmentInput,
  IngestedAttachmentContext,
} from '../schemas/assistantSchema';
import type { RoutingDecision } from '../schemas/jevSchema';

const DRAFT_REGEX =
  /widerspruch|възражение|обжалв|официален отговор|напиши отговор|напиши писмо|състави|antwortschreiben|draft/i;
const PORTAL_REGEX =
  /портал|онлайн|формуляр|formular|antrag|молба|попълн|скрийншот|screenshot|elterngeld|документи за|трябват ми|трябва ми .* за (wohngeld|kinderzuschlag)/i;
const LETTER_REGEX = /писмо|bescheid|решение от|срок|frist|mahnung|разчети|обясни ми/i;
const DELETE_REGEX = /изтрий|изтрии|премахни|махни|заличи|delete|löschen/i;
const FACT_REGEX =
  /steuer-?id|iban|kindergeldnummer|kaltmiete|versicherungsnummer|адрес|факт|лични данни|моите данни/i;
const SAVE_REGEX =
  /запази|качи|добави в сейфа|промени|редактирай|преименувай|смени заглавие|смени датата/i;
const VAULT_SEARCH_REGEX =
  /намери|покажи|търся|документ|файл|сейф|kinderzuschlag|wohngeld|kontoauszug|kontoauszüge|mietvertrag|sparkasse|familienkasse|finanzamt|jobcenter/i;
const GENERAL_CHAT_REGEX =
  /^(?:здравей|здрасти|привет|добро утро|добър ден|добър вечер|хей|hello|hi\b)|как си|кой си|какво можеш|напиши код|програмиране|рецепта|преведи|пресметни|колко е|обясни какво е|какво масло|как работи/i;

export interface KeywordClassifierInput {
  readonly message: string;
  readonly attachment: ChatAttachmentInput | null;
  readonly ingestedAttachment?: IngestedAttachmentContext | null;
}

export const SECRET_CHAT_PLACEHOLDER =
  '🔒 [Заявка за парола/тайна — съдържанието не се записва в чата]';

export const isSecretIntentMessage = (message: string): boolean =>
  isSuspectedSecretFact(message, null);

const decision = (
  department: AssistantDepartment,
  intent: AssistantIntent
): RoutingDecision => ({ department, intent });

export const classifyByKeywords = (input: KeywordClassifierInput): RoutingDecision => {
  const text = input.message.toLowerCase().trim();
  const hasAttachment = input.attachment !== null;
  const ingested = input.ingestedAttachment ?? null;

  if (isSecretIntentMessage(input.message)) {
    return decision('vault_search_and_manage', 'manage_secret');
  }
  if (DRAFT_REGEX.test(text)) {
    return decision('german_bureaucracy', 'draft_reply');
  }
  if (DELETE_REGEX.test(text)) {
    return FACT_REGEX.test(text)
      ? decision('vault_search_and_manage', 'manage_fact')
      : decision('vault_search_and_manage', 'delete_document');
  }
  if (PORTAL_REGEX.test(text)) {
    return decision('german_bureaucracy', 'portal_assist');
  }
  if (hasAttachment && !input.attachment?.saveToVault && !SAVE_REGEX.test(text)) {
    if (
      ingested &&
      ingested.topic === 'allgemein' &&
      ingested.docType === 'sonstiges' &&
      !LETTER_REGEX.test(text) &&
      !VAULT_SEARCH_REGEX.test(text) &&
      GENERAL_CHAT_REGEX.test(text)
    ) {
      return decision('general_chat', 'general_chat');
    }
    return decision('german_bureaucracy', 'letter_or_form');
  }
  if (FACT_REGEX.test(text)) {
    return decision('vault_search_and_manage', 'manage_fact');
  }
  if (hasAttachment || SAVE_REGEX.test(text)) {
    return decision('vault_search_and_manage', 'save_or_update_document');
  }
  if (LETTER_REGEX.test(text)) {
    return decision('german_bureaucracy', 'letter_or_form');
  }
  if (!VAULT_SEARCH_REGEX.test(text) && GENERAL_CHAT_REGEX.test(text)) {
    return decision('general_chat', 'general_chat');
  }
  return decision('vault_search_and_manage', 'search_documents');
};
