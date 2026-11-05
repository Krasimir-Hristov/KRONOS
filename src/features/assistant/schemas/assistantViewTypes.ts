import type { CatalogDocumentItem } from '@/features/documents';
import type { AssistantTurnPayload, ChatSessionSummary } from './assistantSchema';

export interface ChatMessageItem {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly createdAt: string;
  readonly payload: AssistantTurnPayload | null;
  readonly zone1Docs: readonly CatalogDocumentItem[];
  readonly zone2Docs: readonly CatalogDocumentItem[];
  readonly portalDocs: readonly CatalogDocumentItem[];
}

export interface AssistantWorkspaceSnapshot {
  readonly sessions: readonly ChatSessionSummary[];
  readonly activeSessionId: string | null;
  readonly messages: readonly ChatMessageItem[];
}

export type AssistantActionResponse<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly errorMessage: string };
