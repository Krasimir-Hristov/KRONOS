import { unzipSync } from 'fflate';

export const TEXT_AND_OFFICE_MIME_TYPES = new Set([
  'text/html',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/xml',
  'text/xml',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export const isTextOrOfficeMimeType = (mimeType: string): boolean =>
  TEXT_AND_OFFICE_MIME_TYPES.has(mimeType.trim().toLowerCase());

const decodeUtf8 = (bytes: Uint8Array): string =>
  new TextDecoder('utf-8', { fatal: false }).decode(bytes);

const decodeXmlEntities = (input: string): string =>
  input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&uuml;/g, 'ü')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&ouml;/g, 'ö')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/&auml;/g, 'ä')
    .replace(/&Auml;/g, 'Ä')
    .replace(/&szlig;/g, 'ß')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => {
      const num = Number(code);
      return Number.isFinite(num) ? String.fromCodePoint(num) : '';
    });

export const extractHtmlText = (rawHtml: string): string => {
  const withoutScripts = rawHtml
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ');

  const withLineBreaks = withoutScripts
    .replace(/<\/(p|div|tr|li|h[1-6]|section|article|header|footer)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/td>|<\/th>/gi, ' | ');

  const stripped = withLineBreaks.replace(/<[^>]+>/g, ' ');
  return decodeXmlEntities(stripped)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
};

export const extractDocxText = (bytes: Uint8Array): string => {
  const archive = unzipSync(bytes);
  const docXmlBytes = archive['word/document.xml'];
  if (!docXmlBytes) {
    throw new Error('Липсва word/document.xml във файла .docx.');
  }

  const xml = decodeUtf8(docXmlBytes);
  const paragraphs = xml.split(/<\/w:p>/i);
  const lines: string[] = [];

  for (const para of paragraphs) {
    const runs = [...para.matchAll(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/gi)];
    if (runs.length > 0) {
      const text = runs
        .map((m) => decodeXmlEntities(m[1] ?? ''))
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) {
        lines.push(text);
      }
    }
  }

  return lines.join('\n');
};

export const extractXlsxText = (bytes: Uint8Array): string => {
  const archive = unzipSync(bytes);
  const sharedStringsBytes = archive['xl/sharedStrings.xml'];
  const sharedStrings: string[] = [];

  if (sharedStringsBytes) {
    const ssXml = decodeUtf8(sharedStringsBytes);
    const siMatches = [...ssXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/gi)];
    for (const si of siMatches) {
      const tMatches = [...(si[1] ?? '').matchAll(/<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/gi)];
      sharedStrings.push(
        tMatches.map((m) => decodeXmlEntities(m[1] ?? '')).join('')
      );
    }
  }

  const sheetKeys = Object.keys(archive)
    .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(k))
    .sort();

  const outputLines: string[] = [];
  for (const sheetKey of sheetKeys) {
    const sheetBytes = archive[sheetKey];
    if (!sheetBytes) continue;
    const sheetXml = decodeUtf8(sheetBytes);
    const rowMatches = [...sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/gi)];

    for (const rowMatch of rowMatches) {
      const rowXml = rowMatch[1] ?? '';
      const cellMatches = [...rowXml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gi)];
      const cells: string[] = [];

      for (const cell of cellMatches) {
        const attrs = cell[1] ?? '';
        const body = cell[2] ?? '';
        const typeMatch = attrs.match(/\bt="([^"]+)"/i);
        const cellType = typeMatch?.[1] ?? '';

        if (cellType === 's') {
          const vMatch = body.match(/<v>(\d+)<\/v>/i);
          const idx = vMatch?.[1] ? Number(vMatch[1]) : -1;
          cells.push(sharedStrings[idx] ?? '');
        } else if (cellType === 'inlineStr') {
          const tMatches = [...body.matchAll(/<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/gi)];
          cells.push(tMatches.map((m) => decodeXmlEntities(m[1] ?? '')).join(''));
        } else {
          const vMatch = body.match(/<v>([\s\S]*?)<\/v>/i);
          if (vMatch?.[1]) {
            cells.push(decodeXmlEntities(vMatch[1].trim()));
          }
        }
      }

      const cleanedRow = cells.map((c) => c.trim()).filter(Boolean);
      if (cleanedRow.length > 0) {
        outputLines.push(cleanedRow.join(' | '));
      }
    }
  }

  return outputLines.join('\n');
};

/**
 * 0.00 EUR Deterministic Local Parser for Text, Web (.html), Office (.docx, .xlsx, .csv),
 * Markdown (.md), JSON (.json), and XML (.xml) documents.
 */
export const extractTextDeterministically = (
  fileName: string,
  mimeType: string,
  bytes: Uint8Array
): string => {
  const mime = mimeType.trim().toLowerCase();

  if (
    mime ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return extractDocxText(bytes);
  }

  if (
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return extractXlsxText(bytes);
  }

  const rawText = decodeUtf8(bytes);

  if (mime === 'text/html') {
    return extractHtmlText(rawText);
  }

  if (mime === 'application/json') {
    try {
      const parsed: unknown = JSON.parse(rawText);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return rawText.trim();
    }
  }

  return rawText.trim() || fileName;
};
