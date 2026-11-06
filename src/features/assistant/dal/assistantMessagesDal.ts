import 'server-only';
import { requireAuthAndPin } from '@/features/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/supabaseServer';
import { assistantTurnPayloadSchema } from '../schemas/assistantSchema';
import type {
  AssistantWorkspaceSnapshot,
  ChatMessageItem,
} from '../schemas/assistantViewTypes';
import { getOwnedChatSessionSummary, listChatSessions } from './assistantChatDal';
import { loadCatalogDocumentsByIds } from './assistantRagDal';

const MESSAGES_PAGE_LIMIT = 200;

export const getChatSessionMessages = async (
  sessionId: string
): Promise<readonly ChatMessageItem[]> => {
  try {
    const { userId } = await requireAuthAndPin({ redirectOnFail: false });
    const supabase = await createServerSupabaseClient();

    const { data: owned } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('owner_id', userId)
      .maybeSingle();
    if (!owned) {
      return [];
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select(
        'id, sender_role, content, metadata, zone1_document_ids, zone2_document_ids, created_at'
      )
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(MESSAGES_PAGE_LIMIT);

    if (error) {
      throw new Error('Неуспешно зареждане на съобщенията.');
    }

    const rows = [...(data ?? [])].reverse();
    const parsedPayloads = rows.map((row) =>
      row.sender_role === 'assistant'
        ? assistantTurnPayloadSchema.safeParse(row.metadata)
        : null
    );

    const allDocIds = new Set<string>();
    rows.forEach((row, index) => {
      row.zone1_document_ids.forEach((id) => allDocIds.add(id));
      row.zone2_document_ids.forEach((id) => allDocIds.add(id));
      const parsed = parsedPayloads[index];
      parsed?.data?.portalDocumentIds.forEach((id) => allDocIds.add(id));
    });

    const docMap = await loadCatalogDocumentsByIds([...allDocIds]);
    const pick = (ids: readonly string[]) =>
      ids.flatMap((id) => {
        const doc = docMap.get(id);
        return doc ? [doc] : [];
      });

    return rows.map((row, index) => {
      const parsed = parsedPayloads[index];
      const payload = parsed?.success ? parsed.data : null;
      const role =
        row.sender_role === 'assistant' || row.sender_role === 'system'
          ? row.sender_role
          : 'user';
      return {
        id: row.id,
        role,
        content: row.content,
        createdAt: row.created_at,
        payload,
        zone1Docs: pick(row.zone1_document_ids),
        zone2Docs: pick(row.zone2_document_ids),
        portalDocs: pick(payload?.portalDocumentIds ?? []),
      };
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Грешка при зареждане на съобщенията.';
    throw new Error(msg, { cause: err });
  }
};

export const loadAssistantWorkspaceSnapshot = async (
  requestedSessionId?: string | null
): Promise<AssistantWorkspaceSnapshot> => {
  const recentSessions = await listChatSessions();
  let sessions = recentSessions;
  let activeSessionId: string | null = null;

  if (requestedSessionId) {
    if (recentSessions.some((s) => s.id === requestedSessionId)) {
      activeSessionId = requestedSessionId;
    } else {
      const ownedOlder = await getOwnedChatSessionSummary(requestedSessionId);
      if (ownedOlder) {
        activeSessionId = ownedOlder.id;
        sessions = [ownedOlder, ...recentSessions];
      }
    }
  }

  if (!activeSessionId) {
    activeSessionId = sessions[0]?.id ?? null;
  }

  const messages = activeSessionId
    ? await getChatSessionMessages(activeSessionId)
    : [];

  return {
    sessions,
    activeSessionId,
    messages,
  };
};
