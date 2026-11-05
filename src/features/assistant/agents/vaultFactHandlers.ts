import 'server-only';
import {
  areFactsDuplicate,
  vaultFactInputSchema,
  vaultFactUpdateSchema,
} from '@/features/vault';
import {
  createVaultFact,
  listVaultFacts,
  updateVaultFact,
} from '@/features/vault/server';
import { isSuspectedSecretFact } from '@/lib/security/secretFactGuard';
import type { HandlerOutput, VaultHandlerContext } from './agentTypes';
import { findFactsByQuery, MAX_FACT_CARDS, toFactCard } from './factCards';

const MAX_DELETE_TARGETS = 10;

const SECRET_REDIRECT_TEXT =
  'Паролите, ПИН кодовете и тайните не се записват като обикновени факти. Използвайте защитената форма за пароли (Step-Up ПИН) по-долу.';

export const handleListFacts = async (ctx: VaultHandlerContext): Promise<HandlerOutput> => {
  const facts = await listVaultFacts();
  const matches = findFactsByQuery(facts, ctx.plan.factQuery);

  if (matches.length === 0) {
    return {
      replyText: ctx.plan.factQuery
        ? `Не намерих запазен факт за „${ctx.plan.factQuery}“. Можете да го добавите с „запази ${ctx.plan.factQuery}: …“ или от секция Данни.`
        : 'В сейфа още няма запазени лични данни.',
    };
  }

  const cards = matches.slice(0, MAX_FACT_CARDS).map(toFactCard);
  return {
    replyText: `Намерих ${matches.length} ${matches.length === 1 ? 'запис' : 'записа'}. Натиснете „Копирай“ до стойността или „Документ“ за оригинала.`,
    payload: { facts: cards },
  };
};

export const handleCreateFact = async (ctx: VaultHandlerContext): Promise<HandlerOutput> => {
  const { label, value, category, hint } = ctx.plan.fact;
  if (!label || !value) {
    return {
      replyText:
        'За да запазя факт, ми кажете и името, и стойността — напр. „запази IBAN: DE12 3456 …“.',
    };
  }
  if (isSuspectedSecretFact(label, hint ?? null)) {
    return {
      replyText: SECRET_REDIRECT_TEXT,
      payload: {
        actions: [
          { kind: 'secrets_gate', mode: 'create', purpose: 'step_up', searchHint: label },
        ],
      },
    };
  }

  const parsed = vaultFactInputSchema.safeParse({
    category: category ?? 'personal',
    label,
    value,
    usernameOrHint: hint ?? null,
    sourceDocumentId: null,
  });
  if (!parsed.success) {
    return { replyText: 'Данните за факта не са валидни. Моля, прегледайте етикета и стойността.' };
  }

  const existing = await listVaultFacts();
  const duplicate = existing.find((fact) =>
    areFactsDuplicate(
      { label: fact.label, value: fact.valuePlain },
      { label: parsed.data.label, value: parsed.data.value }
    )
  );
  if (duplicate) {
    return {
      replyText: `Този факт вече е запазен като „${duplicate.label}“.`,
      payload: { facts: [toFactCard(duplicate)] },
    };
  }

  await createVaultFact(parsed.data);
  return {
    replyText: `Запазих „${parsed.data.label}“ в сейфа.`,
    payload: {
      actions: [{ kind: 'notice', tone: 'success', text: `Записан факт: ${parsed.data.label}`, documentId: null }],
    },
  };
};

export const handleUpdateFact = async (ctx: VaultHandlerContext): Promise<HandlerOutput> => {
  const { label, value, category, hint } = ctx.plan.fact;
  if (label === null && value === null && category === null && hint === undefined) {
    return { replyText: 'Какво точно да променя? Кажете ми новата стойност или ново име на факта.' };
  }

  const facts = await listVaultFacts();
  const query = ctx.plan.factQuery || label || '';
  const matches = findFactsByQuery(facts, query);

  if (matches.length === 0) {
    return { replyText: `Не намерих факт „${query}“, който да променя.` };
  }
  const target = matches[0];
  if (!target || matches.length > 1) {
    return {
      replyText: 'Намерих няколко подобни записа. Уточнете кой точно да променя.',
      payload: { facts: matches.slice(0, MAX_FACT_CARDS).map(toFactCard) },
    };
  }

  const nextLabel = label ?? target.label;
  const nextHint = hint !== undefined ? hint : target.usernameOrHint;
  if (isSuspectedSecretFact(nextLabel, nextHint)) {
    return {
      replyText: SECRET_REDIRECT_TEXT,
      payload: {
        actions: [
          { kind: 'secrets_gate', mode: 'edit', purpose: 'step_up', searchHint: nextLabel },
        ],
      },
    };
  }

  const parsed = vaultFactUpdateSchema.safeParse({
    id: target.id,
    category: category ?? target.category,
    label: nextLabel,
    value: value ?? target.valuePlain,
    usernameOrHint: nextHint,
  });
  if (!parsed.success) {
    return { replyText: 'Промяната не е валидна. Проверете етикета и стойността.' };
  }

  const duplicate = facts.find(
    (fact) =>
      fact.id !== target.id &&
      areFactsDuplicate(
        { label: fact.label, value: fact.valuePlain },
        { label: parsed.data.label, value: parsed.data.value }
      )
  );
  if (duplicate) {
    return {
      replyText: `Промяната дублира вече съществуващ запис „${duplicate.label}“.`,
      payload: { facts: [toFactCard(duplicate)] },
    };
  }

  await updateVaultFact(parsed.data);
  return {
    replyText: `Обнових „${parsed.data.label}“.`,
    payload: {
      facts: [
        toFactCard({
          ...target,
          category: parsed.data.category,
          label: parsed.data.label,
          valuePlain: parsed.data.value,
          usernameOrHint: parsed.data.usernameOrHint ?? null,
        }),
      ],
    },
  };
};

export const handleDeleteFacts = async (ctx: VaultHandlerContext): Promise<HandlerOutput> => {
  const facts = await listVaultFacts();
  const query = ctx.plan.factQuery || ctx.plan.fact.label || '';
  const matches = query ? findFactsByQuery(facts, query) : [];

  if (matches.length === 0) {
    return { replyText: 'Не намерих запис за изтриване. Кажете ми кой факт да премахна (напр. „изтрий IBAN“).' };
  }
  if (matches.length > MAX_DELETE_TARGETS) {
    return {
      replyText: 'Намерих твърде много записа. Уточнете по-конкретно кой да изтрия.',
      payload: { facts: matches.slice(0, MAX_FACT_CARDS).map(toFactCard) },
    };
  }

  return {
    replyText: `Намерих ${matches.length} ${matches.length === 1 ? 'запис' : 'записа'}. Потвърдете, за да ${matches.length === 1 ? 'го' : 'ги'} изтрия завинаги.`,
    payload: {
      facts: matches.map(toFactCard),
      actions: [
        {
          kind: 'confirm_delete',
          target: 'facts',
          ids: matches.map((fact) => fact.id),
          labels: matches.map((fact) => fact.label),
        },
      ],
    },
  };
};
