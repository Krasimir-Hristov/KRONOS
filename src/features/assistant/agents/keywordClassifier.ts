import { isSuspectedSecretFact } from '@/lib/security/secretFactGuard';
import type {
  AssistantDepartment,
  AssistantIntent,
  ChatAttachmentInput,
} from '../schemas/assistantSchema';
import type { RoutingDecision } from '../schemas/jevSchema';

const DRAFT_REGEX = /widerspruch|възражение|обжалв|официален отговор|напиши отговор|напиши писмо|състави|antwortschreiben|draft/i;
const PORTAL_REGEX = /портал|онлайн|формуляр|formular|antrag|молба|попълн|скрийншот|screenshot|elterngeld|документи за|трябват ми|трябва ми .* за (wohngeld|kinderzuschlag)/i;
const LETTER_REGEX = /писмо|bescheid|решение от|срок|frist|mahnung|разчети|обясни ми/i;
const DELETE_REGEX = /изтрий|изтрии|премахни|махни|заличи|delete|löschen/i;
const FACT_REGEX = /steuer-?id|iban|kindergeldnummer|kaltmiete|versicherungsnummer|адрес|факт|лични данни|моите данни/i;
const SAVE_REGEX = /запази|качи|добави в сейфа|промени|редактирай|преименувай|смени заглавие|смени датата/i;

export interface KeywordClassifierInput {
  readonly message: string;
  readonly attachment: ChatAttachmentInput | null;
}

export const isSecretIntentMessage = (message: string): boolean =>
  isSuspectedSecretFact(message, null);

const decision = (
  department: AssistantDepartment,
  intent: AssistantIntent
): RoutingDecision => ({ department, intent });

export const classifyByKeywords = (input: KeywordClassifierInput): RoutingDecision => {
  const text = input.message.toLowerCase();
  const hasAttachment = input.attachment !== null;

  if (isSecretIntentMessage(input.message)) {
    return decision('vault_search_and_manage', 'manage_secret');
  }
  if (DRAFT_REGEX.test(text)) {
    return decision('german_bureaucracy', 'draft_reply');
  }
  if (PORTAL_REGEX.test(text)) {
    return decision('german_bureaucracy', 'portal_assist');
  }
  if (hasAttachment && !input.attachment?.saveToVault) {
    return decision('german_bureaucracy', 'letter_or_form');
  }
  if (DELETE_REGEX.test(text)) {
    return FACT_REGEX.test(text)
      ? decision('vault_search_and_manage', 'manage_fact')
      : decision('vault_search_and_manage', 'delete_document');
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
  return decision('vault_search_and_manage', 'search_documents');
};
