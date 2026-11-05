import 'server-only';
import type { CatalogDocumentItem } from '@/features/documents';
import { updateApprovedDocumentMetadata } from '@/features/documents/server';
import type { HandlerOutput, VaultHandlerContext } from './agentTypes';
import { runDocumentSearch, type HybridSearchFn } from './vaultDocumentSearch';
import { splitIntoZones, type SplitZonesDeps } from './zoneRanking';

const NOT_FOUND_TEXT =
  'Не намерих подходящ документ. Опитайте с друга ключова дума (напр. институция или тема) или прегледайте Документния Сейф.';

export interface DocumentHandlerDeps {
  readonly search?: HybridSearchFn;
  readonly zones?: SplitZonesDeps;
}

interface ZonedSearch {
  readonly docs: readonly CatalogDocumentItem[];
  readonly zone1Ids: readonly string[];
  readonly zone2Ids: readonly string[];
  readonly usedJev: boolean;
}

const searchAndZone = async (
  ctx: VaultHandlerContext,
  deps: DocumentHandlerDeps
): Promise<ZonedSearch> => {
  const { docs } = await runDocumentSearch(ctx.plan, ctx.message, ctx.nowIso, deps.search);
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

  const zone2Note =
    result.zone2Ids.length > 0
      ? ` Отдолу са още ${result.zone2Ids.length} сходни — от най-нови към най-стари.`
      : '';
  const jevNote = result.usedJev
    ? ''
    : ' (Jev не отговори навреме — подредих по резервен алгоритъм.)';

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
  const hasChange = Object.values(update).some((value) => value !== null);
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
  if (result.zone1Ids.length > 1) {
    return {
      replyText: 'Попаднах на два еднакво подходящи документа. Уточнете кой точно да променя.',
      zone1Ids: result.zone1Ids,
      zone2Ids: result.zone2Ids,
    };
  }

  await updateApprovedDocumentMetadata({
    id: target.id,
    title: update.title ?? target.title,
    topic: update.topic ?? target.topic,
    docType: update.docType ?? target.docType,
    sender: update.sender ?? target.sender,
    docDate: update.docDate ?? target.docDate,
    expiresAt: update.expiresAt ?? target.expiresAt,
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
      'Намерих следното за изтриване. Изтриването е необратимо — файлът, OCR текстът и векторите се заличават от навсякъде. Потвърдете с бутона.',
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
