import 'server-only';
import type { CatalogDocumentItem } from '@/features/documents';
import {
  purgeDocumentsHard,
  updateApprovedDocumentMetadata,
} from '@/features/documents/server';
import { purgeVaultFactsBatch } from '@/features/vault/server';
import type { JevRerankStatus } from '../schemas/jevSchema';
import type { HandlerOutput, VaultHandlerContext } from './agentTypes';
import { runDocumentSearch, type HybridSearchFn } from './vaultDocumentSearch';
import { splitIntoZones, type SplitZonesDeps } from './zoneRanking';

const NOT_FOUND_TEXT =
  'Не намерих подходящ документ. Опитайте с друга ключова дума (напр. институция или тема) или прегледайте Документния Сейф.';

export const CONVERSATIONAL_DELETE_CONFIRM_REGEX =
  /^(?:да|потвърждавам|съгласен\s+съм|изтрий\s+(?:го|ги|я|всички)|да[,.\s]+(?:изтрий|потвърждавам)|потвърждавам\s+изтриването|yes[,.\s]*delete)/i;

export interface DocumentHandlerDeps {
  readonly search?: HybridSearchFn;
  readonly zones?: SplitZonesDeps;
}

interface ZonedSearch {
  readonly docs: readonly CatalogDocumentItem[];
  readonly zone1Ids: readonly string[];
  readonly zone2Ids: readonly string[];
  readonly usedJev: boolean;
  readonly jevStatus: JevRerankStatus;
}

export const tryExecutePendingDeleteConfirmation = async (
  message: string,
  previousAgentState: Record<string, unknown> | null
): Promise<HandlerOutput | null> => {
  if (!previousAgentState || !CONVERSATIONAL_DELETE_CONFIRM_REGEX.test(message.trim())) {
    return null;
  }

  const pending = previousAgentState.pendingConfirmDelete as
    | {
        readonly target?: unknown;
        readonly ids?: unknown;
      }
    | undefined;

  if (!pending || !Array.isArray(pending.ids) || pending.ids.length === 0) {
    return null;
  }

  const validIds = pending.ids.filter(
    (id): id is string => typeof id === 'string' && id.length > 0
  );
  if (validIds.length === 0) {
    return null;
  }

  if (pending.target === 'documents') {
    const res = await purgeDocumentsHard(validIds);
    return {
      replyText: `✅ Потвърдено! Изтрих завинаги (100% Hard Purge) ${res.purgedCount} документа (физически файл в Storage + OCR + вектори).`,
      payload: {
        actions: [
          {
            kind: 'notice',
            tone: 'success',
            text: `Изтрити завинаги документи: ${res.purgedCount}`,
            documentId: null,
          },
        ],
      },
    };
  }

  if (pending.target === 'facts') {
    const purgedCount = await purgeVaultFactsBatch(validIds);
    return {
      replyText: `✅ Потвърдено! Изтрих завинаги (100% Hard Purge) ${purgedCount} лични записа от сейфа.`,
      payload: {
        actions: [
          {
            kind: 'notice',
            tone: 'success',
            text: `Изтрити лични записи: ${purgedCount}`,
            documentId: null,
          },
        ],
      },
    };
  }

  return null;
};

const searchAndZone = async (
  ctx: VaultHandlerContext,
  deps: DocumentHandlerDeps
): Promise<ZonedSearch> => {
  const allowTopicRelaxation =
    ctx.plan.action !== 'update_document' && ctx.plan.action !== 'delete_documents';
  const { docs } = await runDocumentSearch(
    ctx.plan,
    ctx.message,
    ctx.nowIso,
    deps.search,
    { allowTopicRelaxation, useVector: ctx.tier !== 'offline' }
  );
  const zones = await splitIntoZones(docs, ctx.message, ctx.nowIso, deps.zones);
  return { docs, ...zones };
};

export const handleSearchDocuments = async (
  ctx: VaultHandlerContext,
  deps: DocumentHandlerDeps = {}
): Promise<HandlerOutput> => {
  const result = await searchAndZone(ctx, deps);
  if (result.docs.length === 0) {
    return { replyText: NOT_FOUND_TEXT };
  }

  const jevNote =
    result.jevStatus === 'timeout'
      ? ' (Jev не отговори навреме — подредих по резервен алгоритъм.)'
      : result.jevStatus === 'error'
        ? ' (Jev класирането е временно недостъпно — подредих по резервен алгоритъм.)'
        : '';

  if (result.zone1Ids.length === 0) {
    const similarNote =
      result.zone2Ids.length > 0
        ? ` По-долу са намерените ${result.zone2Ids.length} сходни документа по темата — подредени от най-нови към най-стари.`
        : '';
    return {
      replyText: `Няма уверено съвпадение за най-точно попадение.${similarNote}${jevNote}`,
      zone1Ids: [],
      zone2Ids: result.zone2Ids,
    };
  }

  const zone2Note =
    result.zone2Ids.length > 0
      ? ` Отдолу са още ${result.zone2Ids.length} сходни — от най-нови към най-стари.`
      : '';

  return {
    replyText: `Най-точното попадение е най-горе (Зона 1).${zone2Note}${jevNote}`,
    zone1Ids: result.zone1Ids,
    zone2Ids: result.zone2Ids,
  };
};

export const handleUpdateDocument = async (
  ctx: VaultHandlerContext,
  deps: DocumentHandlerDeps = {}
): Promise<HandlerOutput> => {
  const { update } = ctx.plan;
  const hasChange =
    update.title !== null ||
    update.topic !== null ||
    update.docType !== null ||
    update.sender !== null ||
    update.docDate !== undefined ||
    update.expiresAt !== undefined;
  if (!hasChange) {
    return {
      replyText:
        'Какво да променя по документа? Напр. „смени заглавието на … на …“ или „датата е 2026-10-15“.',
    };
  }

  const result = await searchAndZone(ctx, deps);
  const target = result.docs.find((doc) => doc.id === result.zone1Ids[0]);
  if (!target) {
    return { replyText: NOT_FOUND_TEXT };
  }
  if (result.zone1Ids.length > 1 || (!result.usedJev && result.docs.length > 1)) {
    return {
      replyText:
        'Попаднах на няколко подходящи документа. Уточнете кой точно да променя (напр. по точно заглавие или дата).',
      zone1Ids: result.zone1Ids,
      zone2Ids: result.zone2Ids,
    };
  }

  await updateApprovedDocumentMetadata({
    id: target.id,
    ...(update.title !== null ? { title: update.title } : {}),
    ...(update.topic !== null ? { topic: update.topic } : {}),
    ...(update.docType !== null ? { docType: update.docType } : {}),
    ...(update.sender !== null ? { sender: update.sender } : {}),
    ...(update.docDate !== undefined ? { docDate: update.docDate } : {}),
    ...(update.expiresAt !== undefined ? { expiresAt: update.expiresAt } : {}),
  });

  return {
    replyText: `Обнових „${update.title ?? target.title}“. Промяната се вижда и в Документния Сейф.`,
    payload: {
      actions: [
        { kind: 'notice', tone: 'success', text: 'Метаданните са обновени.', documentId: target.id },
      ],
    },
    zone1Ids: [target.id],
    zone2Ids: [],
  };
};

export const handleDeleteDocuments = async (
  ctx: VaultHandlerContext,
  deps: DocumentHandlerDeps = {}
): Promise<HandlerOutput> => {
  const result = await searchAndZone(ctx, deps);
  const targets = result.docs.filter((doc) => result.zone1Ids.includes(doc.id));
  if (targets.length === 0) {
    return { replyText: NOT_FOUND_TEXT };
  }

  return {
    replyText:
      'Намерих следното за изтриване. Изтриването е необратимо — файлът, OCR текстът и векторите се заличават от навсякъде. Потвърдете с бутона или кажете „Да, изтрий го“.',
    payload: {
      actions: [
        {
          kind: 'confirm_delete',
          target: 'documents',
          ids: targets.map((doc) => doc.id),
          labels: targets.map((doc) => doc.title),
        },
      ],
    },
    zone1Ids: targets.map((doc) => doc.id),
    zone2Ids: [],
  };
};
