import type { SidebarPlaceholderLink } from './kronosChatTypes';

export * from './kronosChatTypes';
export * from './kronosChatPrompts';
export * from './kronosChatScenarios';

export const SIDEBAR_PLACEHOLDER_LINKS: readonly SidebarPlaceholderLink[] = [
  {
    id: 'portal-antrag',
    labelKey: 'subagentAntrag',
    badgeKey: 'subagentSoon',
    hintKey: 'subagentHint',
    label: 'Генератор на Молби (Antrag)',
    badge: 'СКОРО',
    hint: 'Неактивен линк (визуален преглед)',
  },
  {
    id: 'widerspruch-ai',
    labelKey: 'subagentWiderspruch',
    badgeKey: 'subagentSoon',
    hintKey: 'subagentHint',
    label: 'Официални Възражения (DE)',
    badge: 'СКОРО',
    hint: 'Неактивен линк (визуален преглед)',
  },
  {
    id: 'ocr-scanner',
    labelKey: 'subagentScanner',
    badgeKey: 'subagentSoon',
    hintKey: 'subagentHint',
    label: 'Мобилен Скенер ➔ 1 PDF',
    badge: 'СКОРО',
    hint: 'Неактивен линк (визуален преглед)',
  },
] as const;
