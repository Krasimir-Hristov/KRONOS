import { z } from 'zod';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@/features/storage';
import { vaultCategorySchema } from '@/features/vault';

export const ASSISTANT_DEPARTMENTS = [
  'vault_search_and_manage',
  'german_bureaucracy',
] as const;

export type AssistantDepartment = (typeof ASSISTANT_DEPARTMENTS)[number];

export const assistantDepartmentSchema = z.enum(ASSISTANT_DEPARTMENTS);

export const ASSISTANT_TIERS = ['jev', 'backup', 'offline', 'local'] as const;
export type AssistantTier = (typeof ASSISTANT_TIERS)[number];
export const assistantTierSchema = z.enum(ASSISTANT_TIERS);

export const ASSISTANT_INTENTS = [
  'search_documents',
  'save_or_update_document',
  'delete_document',
  'manage_fact',
  'manage_secret',
  'portal_assist',
  'letter_or_form',
  'draft_reply',
  'general_chat',
] as const;

export type AssistantIntent = (typeof ASSISTANT_INTENTS)[number];
export const assistantIntentSchema = z.enum(ASSISTANT_INTENTS);

export const MAX_CHAT_MESSAGE_LENGTH = 4000;

export const chatAttachmentInputSchema = z.object({
  storagePath: z.string().trim().min(5).max(500),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  fileSizeBytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
  saveToVault: z.boolean().default(false),
});

export type ChatAttachmentInput = z.infer<typeof chatAttachmentInputSchema>;

export const sendChatMessageInputSchema = z
  .object({
    sessionId: z.string().uuid().nullable().optional(),
    message: z.string().trim().max(MAX_CHAT_MESSAGE_LENGTH).default(''),
    attachment: chatAttachmentInputSchema.nullable().optional(),
  })
  .refine((value) => value.message.length > 0 || Boolean(value.attachment), {
    message: 'Напишете съобщение или прикачете файл.',
  });

export type SendChatMessageInput = z.infer<typeof sendChatMessageInputSchema>;

export const factCardSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  value: z.string(),
  category: vaultCategorySchema.catch('other'),
  sourceDocumentId: z.string().uuid().nullable(),
  sourceDocumentTitle: z.string().nullable(),
  sourceDocumentDate: z.string().nullable(),
});

export type FactCard = z.infer<typeof factCardSchema>;

export const draftReplySchema = z.object({
  subjectLine: z.string().trim().max(240),
  germanText: z.string().trim().min(1).max(8000),
  bulgarianExplanation: z.string().trim().max(3000).default(''),
});

export type DraftReply = z.infer<typeof draftReplySchema>;

export const portalGuideSchema = z.object({
  explanationBg: z.string().trim().max(3000),
  deadline: z.string().trim().max(120).nullable().default(null),
  steps: z.array(z.string().trim().max(400)).max(15).default([]),
  neededDocuments: z
    .array(
      z.object({
        description: z.string().trim().max(240),
        topic: z.string().trim().max(60).nullable().default(null),
        monthsBack: z.number().int().min(1).max(36).nullable().default(null),
      })
    )
    .max(12)
    .default([]),
  neededFactLabels: z.array(z.string().trim().max(120)).max(15).default([]),
});

export type PortalGuide = z.infer<typeof portalGuideSchema>;

export const DELETE_TARGETS = ['documents', 'facts', 'secrets'] as const;
export type DeleteTarget = (typeof DELETE_TARGETS)[number];

export const assistantActionCardSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('confirm_delete'),
    target: z.enum(DELETE_TARGETS),
    ids: z.array(z.string().uuid()).min(1).max(50),
    labels: z.array(z.string()).max(50),
  }),
  z.object({
    kind: z.literal('secrets_gate'),
    mode: z.enum(['browse', 'create']),
    searchHint: z.string().max(120).nullable().default(null),
  }),
  z.object({
    kind: z.literal('notice'),
    tone: z.enum(['success', 'warning']),
    text: z.string().max(500),
    documentId: z.string().uuid().nullable().default(null),
  }),
]);

export type AssistantActionCard = z.infer<typeof assistantActionCardSchema>;

export const assistantTurnPayloadSchema = z.object({
  department: assistantDepartmentSchema.nullable().default(null),
  intent: assistantIntentSchema.nullable().default(null),
  tier: assistantTierSchema.default('offline'),
  errorCode: z.enum(['AI_UNAVAILABLE']).nullable().default(null),
  facts: z.array(factCardSchema).default([]),
  guide: portalGuideSchema.nullable().default(null),
  draft: draftReplySchema.nullable().default(null),
  actions: z.array(assistantActionCardSchema).default([]),
  portalDocumentIds: z.array(z.string().uuid()).default([]),
});

export type AssistantTurnPayload = z.infer<typeof assistantTurnPayloadSchema>;

export const emptyTurnPayload = (): AssistantTurnPayload =>
  assistantTurnPayloadSchema.parse({});

export const assistantTurnResultSchema = z.object({
  replyText: z.string().min(1).max(12000),
  payload: assistantTurnPayloadSchema,
  zone1DocumentIds: z.array(z.string().uuid()).max(5),
  zone2DocumentIds: z.array(z.string().uuid()).max(60),
});

export type AssistantTurnResult = z.infer<typeof assistantTurnResultSchema>;

export const agentExecutionInputSchema = z.object({
  message: z.string().max(MAX_CHAT_MESSAGE_LENGTH),
  intent: assistantIntentSchema,
  tier: assistantTierSchema,
  attachment: chatAttachmentInputSchema.nullable(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(MAX_CHAT_MESSAGE_LENGTH * 3),
      })
    )
    .max(8),
  nowIso: z.string(),
});

export type AgentExecutionInput = z.infer<typeof agentExecutionInputSchema>;

export interface SubAgentManifest {
  readonly agentId: string;
  readonly department: AssistantDepartment;
  readonly jevCriteria: string;
  readonly inputSchema: typeof agentExecutionInputSchema;
  readonly outputSchema: typeof assistantTurnResultSchema;
  readonly execute: (input: AgentExecutionInput) => Promise<AssistantTurnResult>;
}

export const confirmDeleteInputSchema = z.object({
  target: z.enum(DELETE_TARGETS),
  ids: z.array(z.string().uuid()).min(1).max(50),
});

export const sessionIdInputSchema = z.object({
  sessionId: z.string().uuid(),
});

export interface ChatSessionSummary {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: string;
}
