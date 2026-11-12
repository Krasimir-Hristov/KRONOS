import type {
  VaultFactItem,
  VaultSecretMaskedItem,
} from '../schemas/vaultSchema';

export const MOCK_VAULT_FACTS: readonly VaultFactItem[] = [
  {
    id: '00000000-0000-4000-8000-000000000301',
    category: 'tax',
    label: 'Steuer-ID (Данъчен номер)',
    valuePlain: '65 928 417 309',
    usernameOrHint: 'Bundeszentralamt für Steuern (IdNr.)',
    sourceDocumentId: '00000000-0000-4000-8000-000000000105',
    sourceDocumentTitle: 'Finanzamt Mitteilung — Steuer-ID (IdNr.)',
    sourceDocumentDate: '2026-08-20',
    updatedAt: '2026-11-11T15:10:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000302',
    category: 'family',
    label: 'Kindergeldnummer',
    valuePlain: '312FK884920',
    usernameOrHint: 'Familienkasse Berlin-Brandenburg',
    sourceDocumentId: '00000000-0000-4000-8000-000000000101',
    sourceDocumentTitle: 'Aufforderung zur Mitwirkung — Kinderzuschlag (KiZ)',
    sourceDocumentDate: '2026-11-10',
    updatedAt: '2026-11-11T15:12:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000303',
    category: 'bank',
    label: 'Sparkasse IBAN (Основна сметка)',
    valuePlain: 'DE89 1005 0000 1064 8293 11',
    usernameOrHint: 'BIC: BELADEBEXXX • Berliner Sparkasse',
    sourceDocumentId: '00000000-0000-4000-8000-000000000102',
    sourceDocumentTitle: 'Sparkasse Kontoauszug 10/2026 (Октомври)',
    sourceDocumentDate: '2026-10-31',
    updatedAt: '2026-11-02T10:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000304',
    category: 'housing',
    label: 'Kaltmiete (Основен месечен наем)',
    valuePlain: '785,00 €',
    usernameOrHint: 'Общо с Nebenkosten & Heizung: 1.070,00 €',
    sourceDocumentId: '00000000-0000-4000-8000-000000000104',
    sourceDocumentTitle: 'Mietvertrag & Mietbescheinigung 2026',
    sourceDocumentDate: '2026-09-15',
    updatedAt: '2026-09-18T11:35:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000305',
    category: 'health',
    label: 'Здравноосигурителен номер (Krankenkasse)',
    valuePlain: 'A109482751',
    usernameOrHint: 'AOK Nordost — Здравна карта',
    sourceDocumentId: null,
    sourceDocumentTitle: null,
    sourceDocumentDate: null,
    updatedAt: '2026-09-05T08:45:00.000Z',
  },
] as const;

export const MOCK_VAULT_SECRETS: readonly VaultSecretMaskedItem[] = [
  {
    id: '00000000-0000-4000-8000-000000000401',
    category: 'tax',
    label: 'ELSTER Онлайн Портал (Финансова служба)',
    usernameOrHint: 'Потребител: kronos.tax.de • AES-256-GCM (Мок Преглед)',
    updatedAt: '2026-11-10T12:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000402',
    category: 'family',
    label: 'Bundesagentur für Arbeit / Familienkasse Портал',
    usernameOrHint: 'BundID профил • Защитена парола (Мок Преглед)',
    updatedAt: '2026-11-08T16:30:00.000Z',
  },
] as const;
