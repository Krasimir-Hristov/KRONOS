export interface MockDocumentHighlightField {
  readonly label: string;
  readonly value: string;
  readonly status: 'verified' | 'required';
}

export interface MockDocumentAttachment {
  readonly id: string;
  readonly title: string;
  readonly sender: string;
  readonly docDate: string;
  readonly uploadedAt: string;
  readonly fileSize: string;
  readonly zone: 'zone1' | 'zone2' | 'uploaded';
  readonly badge: string;
  readonly referenceCode: string;
  readonly previewSummary: string;
  readonly previewParagraphs: readonly string[];
  readonly highlightedFields: readonly MockDocumentHighlightField[];
}

export interface MockExtractedFact {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly sourceDocTitle: string;
}

export interface MockChatMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly timestamp: string;
  readonly responseDuration?: string;
  readonly modelTag?: string;
  readonly userUploadedDoc?: MockDocumentAttachment;
  readonly documents?: readonly MockDocumentAttachment[];
  readonly facts?: readonly MockExtractedFact[];
}

export interface MockConversationSession {
  readonly id: string;
  readonly title: string;
  readonly categoryLabel: string;
  readonly updatedAtLabel: string;
  readonly messages: readonly MockChatMessage[];
}

export interface SidebarPlaceholderLink {
  readonly id: string;
  readonly label: string;
  readonly badge: string;
  readonly hint: string;
}

export const SIDEBAR_PLACEHOLDER_LINKS: readonly SidebarPlaceholderLink[] = [
  { id: 'portal-antrag', label: 'Генератор на Молби (Antrag)', badge: 'СКОРО', hint: 'Неактивен линк (визуален преглед)' },
  { id: 'widerspruch-ai', label: 'Официални Възражения (DE)', badge: 'СКОРО', hint: 'Неактивен линк (визуален преглед)' },
  { id: 'ocr-scanner', label: 'Мобилен Скенер ➔ 1 PDF', badge: 'СКОРО', hint: 'Неактивен линк (визуален преглед)' },
] as const;

export const CHAT_STARTER_PROMPTS = [
  {
    id: 'kinderzuschlag',
    title: 'Писмо за Kinderzuschlag',
    subtitle: 'Какви документи ми искат и до кога е срокът?',
    prompt: 'Качвам формуляра от Familienkasse за Kinderzuschlag. Какво точно трябва да попълня и какви документи да прикача?',
  },
  {
    id: 'kontoauszuege',
    title: 'Банкови извлечения за портал',
    subtitle: 'Подготви последните 3 Kontoauszüge като отделни файлове',
    prompt: 'Подготви ми последните банкови извлечения от Sparkasse за онлайн портала на Wohngeld, без да ги слепваш в един PDF.',
  },
  {
    id: 'steuer-iban',
    title: 'Справка за Steuer-ID и IBAN',
    subtitle: 'Покажи ми личните данни с 1-клик копиране',
    prompt: 'Извади ми моя Steuer-ID, Kindergeldnummer и IBAN от сейфа, за да ги копирам във формуляра.',
  },
  {
    id: 'mietvertrag',
    title: 'Проверка на Kaltmiete и Nebenkosten',
    subtitle: 'Данни от договора за наем (Mietvertrag)',
    prompt: 'Колко точно ми е Kaltmiete и Heizkosten според последния договор за наем и писмото от наемодателя?',
  },
] as const;

export const MOCK_CHAT_SESSIONS: readonly MockConversationSession[] = [
  {
    id: 'session-kiz',
    title: 'Kinderzuschlag — формуляр и документи',
    categoryLabel: 'Familienkasse',
    updatedAtLabel: 'Днес • 19:42 ч.',
    messages: [
      {
        id: 'm-1',
        role: 'user',
        timestamp: '19:42:10 ч.',
        content:
          'Качих ти сканирания формуляр от Familienkasse за Kinderzuschlag. Кажи ми какво точно трябва да попълня в празните полета и ми извади нужните документи от сейфа.',
        userUploadedDoc: {
          id: 'doc-uploaded-kiz-form',
          title: 'KiZ_Antrag_Formular_2026.pdf (Качен за попълване)',
          sender: 'Качен от вас във въпроса • 2 страници',
          docDate: '2026-11-12',
          uploadedAt: '19:42:10 ч.',
          fileSize: '1.18 MB • PDF / Скан',
          zone: 'uploaded',
          badge: 'КАЧЕН В ЧАТА • ЗА ПОПЪЛВАНЕ',
          referenceCode: 'FORM-KIZ-2026-BG',
          previewSummary:
            'Официален формуляр за Kinderzuschlag (Раздел 2 и Раздел 4). Открити са задължителни полета за попълване и изискване за прикачване на банково извлечение и наем.',
          previewParagraphs: [
            'Bundesagentur für Arbeit — Familienkasse Berlin-Brandenburg',
            'Antrag auf Kinderzuschlag (KiZ) gemäß § 6a Bundeskindergeldgesetz (BKGG).',
            'Поле 2.1: Kindergeld-Nr. • Поле 2.2: Steuer-Identifikationsnummer (IdNr.)',
            'Поле 4.1: IBAN сметка за превод + доказателство за Kaltmiete.',
          ],
          highlightedFields: [
            { label: 'Поле 2.1 • Kindergeld-Nr.', value: '312FK884920 (Попълни)', status: 'required' },
            { label: 'Поле 2.2 • Steuer-ID', value: '65 928 417 309 (Попълни)', status: 'required' },
            { label: 'Поле 4.1 • IBAN сметка', value: 'DE89 1005 0000 1064 8293 11', status: 'required' },
            { label: 'Краен срок за подаване', value: '28.11.2026 г.', status: 'verified' },
          ],
        },
      },
      {
        id: 'm-2',
        role: 'assistant',
        timestamp: '19:42:14 ч.',
        responseDuration: '3.6 сек',
        modelTag: 'KRONOS Neural v2 • Jev Zone-1',
        content:
          'Прегледах качения от вас формуляр (KiZ_Antrag_Formular_2026.pdf) и го съпоставих с документите във вашия сейф. Крайният срок към Familienkasse Berlin-Brandenburg е 28.11.2026 г.\n\nВдясно в разделения екран можете да разгледате в реално време както качения формуляр за попълване, така и откритите документи от сейфа (Зона 1 и Зона 2), а по-долу са готовите стойности за директно копиране:',
        documents: [
          {
            id: 'doc-mock-1',
            title: 'Aufforderung zur Mitwirkung — Kinderzuschlag (KiZ)',
            sender: 'Familienkasse Berlin-Brandenburg',
            docDate: '2026-11-10',
            uploadedAt: '2026-11-11',
            fileSize: '1.42 MB • PDF',
            zone: 'zone1',
            badge: 'ЗОНА 1 • 99% Точност',
            referenceCode: 'FK-BER-312FK884920',
            previewSummary:
              'Официално писмо-изискване от Familienkasse за представяне на доказателства за доходи и наем към молбата за Kinderzuschlag.',
            previewParagraphs: [
              'Familienkasse Berlin-Brandenburg • Пощенски код 10958 Berlin',
              'Относно: Ваша молба за Kinderzuschlag • Kindergeld-Nr.: 312FK884920',
              'Моля, представете до 28.11.2026 г. актуални банкови извлечения (Kontoauszüge) и актуално удостоверение за основния наем (Kaltmiete).',
            ],
            highlightedFields: [
              { label: 'Kindergeldnummer', value: '312FK884920', status: 'verified' },
              { label: 'Изискан документ #1', value: 'Kontoauszug 10/2026', status: 'verified' },
              { label: 'Изискан документ #2', value: 'Mietbescheinigung 2026', status: 'verified' },
            ],
          },
          {
            id: 'doc-mock-2',
            title: 'Sparkasse Kontoauszug 10/2026 (Октомври)',
            sender: 'Berliner Sparkasse',
            docDate: '2026-10-31',
            uploadedAt: '2026-11-02',
            fileSize: '840 KB • PDF',
            zone: 'zone2',
            badge: 'ЗОНА 2 • Свързан документ',
            referenceCode: 'SPK-2026-10-A1',
            previewSummary:
              'Официално банково извлечение от Berliner Sparkasse за м. октомври 2026 г., доказващо платен наем и получено трудово възнаграждение.',
            previewParagraphs: [
              'Berliner Sparkasse • Извлечение № 10 / 2026 • IBAN: DE89 1005 0000 1064 8293 11',
              '01.10.2026 — Превод за наем (Vonovia SE): -1.070,00 € (вкл. Kaltmiete 785,00 €)',
              '29.10.2026 — Заплата (TechSolutions GmbH): +2.640,00 €',
            ],
            highlightedFields: [
              { label: 'IBAN', value: 'DE89 1005 0000 1064 8293 11', status: 'verified' },
              { label: 'Платен наем (01.10)', value: '785,00 € Kaltmiete', status: 'verified' },
              { label: 'Нетен доход (29.10)', value: '2.640,00 €', status: 'verified' },
            ],
          },
          {
            id: 'doc-mock-3',
            title: 'Mietbescheinigung & Kaltmiete 2026',
            sender: 'Vonovia SE / Hausverwaltung',
            docDate: '2026-09-15',
            uploadedAt: '2026-09-18',
            fileSize: '1.15 MB • PDF',
            zone: 'zone2',
            badge: 'ЗОНА 2 • Свързан документ',
            referenceCode: 'VON-MIET-2026-09',
            previewSummary:
              'Официална справка от наемодателя с разбивка на чистия наем (Kaltmiete), оперативните разходи (Betriebskosten) и отоплението (Heizkosten).',
            previewParagraphs: [
              'Vonovia Kundenservice GmbH • Удостоверение за наем (Mietbescheinigung)',
              'Основен наем (Kaltmiete): 785,00 € • Студени разходи: 165,00 € • Отопление: 120,00 €',
            ],
            highlightedFields: [
              { label: 'Kaltmiete (Чист наем)', value: '785,00 € / месец', status: 'verified' },
              { label: 'Heizkosten (Отопление)', value: '120,00 € / месец', status: 'verified' },
            ],
          },
        ],
        facts: [
          { id: 'f-1', label: 'Kindergeldnummer', value: '312FK884920', sourceDocTitle: 'Aufforderung zur Mitwirkung (KiZ)' },
          { id: 'f-2', label: 'Steuer-ID (IdNr.)', value: '65 928 417 309', sourceDocTitle: 'Finanzamt Bescheid 2026' },
          { id: 'f-3', label: 'Sparkasse IBAN', value: 'DE89 1005 0000 1064 8293 11', sourceDocTitle: 'Sparkasse Kontoauszug 10/2026' },
          { id: 'f-4', label: 'Актуален Kaltmiete', value: '785,00 € / месец', sourceDocTitle: 'Mietbescheinigung 2026' },
        ],
      },
    ],
  },
  {
    id: 'session-wohngeld',
    title: 'Wohngeld — извлечения за 6 месеца',
    categoryLabel: 'Wohngeldamt',
    updatedAtLabel: 'Вчера • 16:18 ч.',
    messages: [
      {
        id: 'm-w1',
        role: 'user',
        timestamp: '16:18:04 ч.',
        content: 'Подготви ми последните банкови извлечения от Sparkasse за онлайн портала на Wohngeld като отделни файлове.',
      },
      {
        id: 'm-w2',
        role: 'assistant',
        timestamp: '16:18:07 ч.',
        responseDuration: '2.9 сек',
        modelTag: 'KRONOS Neural v2 • Портал Режим',
        content:
          'Подготвих извлеченията като отделни файлове с чисти имена (по подразбиране не са слепени в един PDF, за да ги качите директно в полетата на германския портал). Можете да ги прегледате вдясно или да ги свалите като ZIP архив:',
        documents: [
          {
            id: 'doc-w1',
            title: '2026-10-31_Sparkasse_Kontoauszug_10_2026.pdf',
            sender: 'Berliner Sparkasse',
            docDate: '2026-10-31',
            uploadedAt: '2026-11-02',
            fileSize: '840 KB • PDF',
            zone: 'zone1',
            badge: 'Готов за Портал #1',
            referenceCode: 'SPK-2026-10',
            previewSummary: 'Банково извлечение за м. октомври 2026 г. — готово за качване в портала за Wohngeld.',
            previewParagraphs: ['Berliner Sparkasse • Kontoauszug 10/2026 • IBAN: DE89 1005 0000 1064 8293 11'],
            highlightedFields: [
              { label: 'Период', value: '01.10.2026 – 31.10.2026', status: 'verified' },
              { label: 'Статус за портал', value: 'Отделен PDF файл (Чисто име)', status: 'verified' },
            ],
          },
        ],
      },
    ],
  },
] as const;
