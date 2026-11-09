import { strToU8, zipSync } from 'fflate';
import { describe, expect, it, vi } from 'vitest';
import { extractUniversalDocumentContent } from '../dal/universalIngestionDal';
import {
  extractTextDeterministically,
  isTextOrOfficeMimeType,
} from './deterministicParsers';

describe('deterministicParsers & universalIngestionDal', () => {
  it('detects text, web, and office MIME types accurately', () => {
    expect(isTextOrOfficeMimeType('text/html')).toBe(true);
    expect(
      isTextOrOfficeMimeType(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
    ).toBe(true);
    expect(
      isTextOrOfficeMimeType(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
    ).toBe(true);
    expect(isTextOrOfficeMimeType('application/pdf')).toBe(false);
    expect(isTextOrOfficeMimeType('image/jpeg')).toBe(false);
  });

  it('parses HTML stripping scripts/styles and preserving block text', () => {
    const html = `
      <html>
        <head><style>body { color: red; }</style><script>alert(1)</script></head>
        <body>
          <h1>Wohngeld Портал</h1>
          <p>Нужни документи: Kontoausz&uuml;ge &amp; Mietvertrag</p>
        </body>
      </html>
    `;
    const text = extractTextDeterministically('portal.html', 'text/html', strToU8(html));
    expect(text).toContain('Wohngeld Портал');
    expect(text).toContain('Kontoauszüge & Mietvertrag');
    expect(text).not.toContain('alert(1)');
  });

  it('parses .docx word/document.xml deterministically via fflate', () => {
    const docxBytes = zipSync({
      'word/document.xml': strToU8(
        `<w:document><w:body><w:p><w:r><w:t>Молба за Kinderzuschlag</w:t></w:r></w:p><w:p><w:r><w:t>Steuer-ID: 12 345 678 901</w:t></w:r></w:p></w:body></w:document>`
      ),
    });

    const text = extractTextDeterministically(
      'Antrag.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      docxBytes
    );
    expect(text).toBe('Молба за Kinderzuschlag\nSteuer-ID: 12 345 678 901');
  });

  it('parses .xlsx sharedStrings and worksheets deterministically via fflate', () => {
    const xlsxBytes = zipSync({
      'xl/sharedStrings.xml': strToU8(
        `<sst><si><t>Месец</t></si><si><t>Kaltmiete</t></si><si><t>Ноември 2026</t></si></sst>`
      ),
      'xl/worksheets/sheet1.xml': strToU8(
        `<worksheet><sheetData><row><c t="s"><v>0</v></c><c t="s"><v>1</v></c></row><row><c t="s"><v>2</v></c><c><v>850.00</v></c></row></sheetData></worksheet>`
      ),
    });

    const text = extractTextDeterministically(
      'Miete.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xlsxBytes
    );
    expect(text).toBe('Месец | Kaltmiete\nНоември 2026 | 850.00');
  });

  it('extractUniversalDocumentContent classifies text/office files without calling Vision OCR', async () => {
    const visionSpy = vi.fn();
    const mockInvoker = vi.fn().mockResolvedValue(
      JSON.stringify({
        title: 'Справка за наем — Ноември 2026',
        topic: 'mietvertrag',
        docType: 'rechnung',
        sender: 'Vermieter',
        docDate: '2026-11-01',
        expiresAt: null,
        summaryText: 'Месечна таблица за Kaltmiete 850 EUR.',
        rawOcrText: '',
        suggestedFacts: [
          {
            label: 'Kaltmiete',
            value: '850.00 EUR',
            category: 'housing',
            hint: null,
          },
        ],
      })
    );

    const res = await extractUniversalDocumentContent(
      {
        fileName: 'miete.csv',
        mimeType: 'text/csv',
        bytes: strToU8('Месец,Kaltmiete\n2026-11,850.00 EUR'),
      },
      { invoker: mockInvoker, visionOcr: visionSpy }
    );

    expect(visionSpy).not.toHaveBeenCalled();
    expect(res.title).toBe('Справка за наем — Ноември 2026');
    expect(res.rawOcrText).toContain('850.00 EUR');
    expect(res.suggestedFacts[0]?.label).toBe('Kaltmiete');
  });
});
