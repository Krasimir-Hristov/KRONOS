import 'server-only';
import { requireAuthAndPin } from '@/features/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/supabaseServer';
import type { Json } from '@/types/databaseTypes';
import {
  isSecretIntentMessage,
  SECRET_CHAT_PLACEHOLDER,
} from '../agents/keywordClassifier';
import type {
  AssistantTurnPayload,
  ChatSessionSummary,
} from '../schemas/assistantSchema';

const DEFAULT_SESSION_TITLE = 'Нов разговор';
const MAX_SESSION_TITLE_LENGTH = 60;

export const buildSessionTitle = (firstMessage: string): string => {
  const flat = firstMessage.replace(/\s+/g, ' ').trim();
  if (!flat) {
    return DEFAULT_SESSION_TITLE;
  }
  return flat.length > MAX_SESSION_TITLE_LENGTH
    ? `${flat.slice(0, MAX_SESSION_TITLE_LENGTH - 1)}…`
    : flat;
};

export const listChatSessions = async (): Promise<readonly ChatSessionSummary[]> => {
  try {
    const { userId } = await requireAuthAndPin({ redirectOnFail: false });
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('id, title, updated_at')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error('Неуспешно зареждане на разговорите.');
    }
    return (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Грешка при зареждане на разговорите.';
    throw new Error(msg, { cause: err });
  }
};

export const getOwnedChatSessionSummary = async (
  sessionId: string
): Promise<ChatSessionSummary | null> => {
  try {
    const { userId } = await requireAuthAndPin({ redirectOnFail: false });
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('id, title, updated_at')
      .eq('id', sessionId)
      .eq('owner_id', userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return {
      id: data.id,
      title: data.title,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
};

export const createChatSession = async (title?: string): Promise<string> => {
  try {
    const { userId } = await requireAuthAndPin({ redirectOnFail: false });
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ owner_id: userId, title: title?.trim() || DEFAULT_SESSION_TITLE })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error('Неуспешно създаване на нов разговор.');
    }
    return data.id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Грешка при създаване на разговор.';
    throw new Error(msg, { cause: err });
  }
};

export const resolveChatSession = async (
  sessionId: string | null | undefined,
  firstMessage: string
): Promise<string> => {
  try {
    const { userId } = await requireAuthAndPin({ redirectOnFail: false });
    if (sessionId) {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('owner_id', userId)
        .maybeSingle();
      if (data) {
        return data.id;
      }
    }
    return await createChatSession(buildSessionTitle(firstMessage));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Грешка при избор на разговор.';
    throw new Error(msg, { cause: err });
  }
};

export const deleteChatSessionHard = async (sessionId: string): Promise<void> => {
  try {
    const { userId } = await requireAuthAndPin({ redirectOnFail: false });
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('owner_id', userId);

    if (error) {
      throw new Error('Неуспешно изтриване на разговора.');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Грешка при изтриване на разговор.';
    throw new Error(msg, { cause: err });
  }
};

export interface AppendChatMessageInput {
  readonly sessionId: string;
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly payload?: AssistantTurnPayload;
  readonly zone1Ids?: readonly string[];
  readonly zone2Ids?: readonly string[];
}

export const appendChatMessage = async (input: AppendChatMessageInput): Promise<void> => {
  try {
    await requireAuthAndPin({ redirectOnFail: false });
    const supabase = await createServerSupabaseClient();

    const metadata: Json = input.payload ? (input.payload as unknown as Json) : {};
    const safeContent =
      input.role === 'user' && isSecretIntentMessage(input.content)
        ? SECRET_CHAT_PLACEHOLDER
        : input.content;

    const { error } = await supabase.rpc('append_chat_message', {
      p_session_id: input.sessionId,
      p_sender_role: input.role,
      p_content: safeContent,
      p_metadata: metadata,
      p_zone1_document_ids: [...(input.zone1Ids ?? [])],
      p_zone2_document_ids: [...(input.zone2Ids ?? [])],
    });

    if (error) {
      throw new Error('Неуспешен запис на съобщението.');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Грешка при запис на съобщение.';
    throw new Error(msg, { cause: err });
  }
};

export const getRecentChatHistory = async (
  sessionId: string,
  limit = 6
): Promise<readonly { readonly role: 'user' | 'assistant'; readonly content: string }[]> => {
  try {
    await requireAuthAndPin({ redirectOnFail: false });
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, sender_role, content, created_at')
      .eq('session_id', sessionId)
      .in('sender_role', ['user', 'assistant'])
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);

    if (error) {
      return [];
    }
    return [...(data ?? [])].reverse().map((row) => ({
      role: row.sender_role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content:
        row.sender_role === 'user' && isSecretIntentMessage(row.content)
          ? SECRET_CHAT_PLACEHOLDER
          : row.content,
    }));
  } catch {
    return [];
  }
};
