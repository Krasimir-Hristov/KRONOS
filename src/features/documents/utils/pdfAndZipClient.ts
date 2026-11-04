import { MAX_FILE_SIZE_BYTES } from '@/features/storage';

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const MAX_IMAGE_DIMENSION_PX = 2200;

export interface BinaryDocumentSource {
  readonly fileName: string;
  readonly mimeType: string;
  readonly bytes: Uint8Array;
}

const rasterizeImageToJpegBytes = async (
  sourceBlob: Blob
): Promise<{
  readonly jpegBytes: Uint8Array;
  readonly width: number;
  readonly height: number;
}> => {
  const bitmap = await createImageBitmap(sourceBlob);
  try {
    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION_PX / Math.max(bitmap.width, bitmap.height)
    );
    const targetW = Math.max(1, Math.round(bitmap.width * scale));
    const targetH = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Браузърът не поддържа обработка на изображения (Canvas 2D).');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    const jpegBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Грешка при JPEG конверсия.'))),
        'image/jpeg',
        0.86
      );
    });

    const buf = await jpegBlob.arrayBuffer();
    return {
      jpegBytes: new Uint8Array(buf),
      width: targetW,
      height: targetH,
    };
  } finally {
    bitmap.close();
  }
};

export const combineCameraImagesToPdfFile = async (
  imageFiles: readonly File[],
  baseTitle: string
): Promise<File> => {
  if (imageFiles.length === 0) {
    throw new Error('Добавете поне една снимка за създаване на PDF.');
  }

  const { PDFDocument } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();

  for (const imgFile of imageFiles) {
    const { jpegBytes, width, height } = await rasterizeImageToJpegBytes(imgFile);
    const embeddedJpg = await pdfDoc.embedJpg(jpegBytes);

    const isLandscape = width > height;
    const pageW = isLandscape ? A4_HEIGHT_PT : A4_WIDTH_PT;
    const pageH = isLandscape ? A4_WIDTH_PT : A4_HEIGHT_PT;
    const margin = 18;

    const availW = pageW - margin * 2;
    const availH = pageH - margin * 2;
    const ratio = Math.min(availW / width, availH / height);
    const drawW = width * ratio;
    const drawH = height * ratio;

    const page = pdfDoc.addPage([pageW, pageH]);
    page.drawImage(embeddedJpg, {
      x: (pageW - drawW) / 2,
      y: (pageH - drawH) / 2,
      width: drawW,
      height: drawH,
    });
  }

  const pdfBytes = await pdfDoc.save();
  if (pdfBytes.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new Error('Обединеният PDF надвишава лимита от 50 MB. Намалете броя снимки.');
  }

  const safeName =
    baseTitle
      .trim()
      .replace(/[^a-zA-Z0-9а-яА-ЯёЁα-ωΑ-Ω0-9_-]/g, '_')
      .slice(0, 60) || 'Снимано_писмо';

  const copyBuffer = new ArrayBuffer(pdfBytes.byteLength);
  new Uint8Array(copyBuffer).set(pdfBytes);

  return new File([copyBuffer], `${safeName}.pdf`, {
    type: 'application/pdf',
  });
};

export const mergeSelectedDocumentsToPdfBytes = async (
  sources: readonly BinaryDocumentSource[]
): Promise<Uint8Array> => {
  if (sources.length === 0) {
    throw new Error('Изберете поне един документ за обединяване.');
  }

  const { PDFDocument } = await import('pdf-lib');
  const mergedPdf = await PDFDocument.create();

  for (const src of sources) {
    if (src.mimeType === 'application/pdf') {
      const donorPdf = await PDFDocument.load(src.bytes, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(donorPdf, donorPdf.getPageIndices());
      for (const page of copiedPages) {
        mergedPdf.addPage(page);
      }
    } else {
      const imgBuffer = new ArrayBuffer(src.bytes.byteLength);
      new Uint8Array(imgBuffer).set(src.bytes);
      const blob = new Blob([imgBuffer], { type: src.mimeType });
      const { jpegBytes, width, height } = await rasterizeImageToJpegBytes(blob);
      const embeddedJpg = await mergedPdf.embedJpg(jpegBytes);
      const isLandscape = width > height;
      const pageW = isLandscape ? A4_HEIGHT_PT : A4_WIDTH_PT;
      const pageH = isLandscape ? A4_WIDTH_PT : A4_HEIGHT_PT;
      const ratio = Math.min((pageW - 24) / width, (pageH - 24) / height);
      const drawW = width * ratio;
      const drawH = height * ratio;
      const page = mergedPdf.addPage([pageW, pageH]);
      page.drawImage(embeddedJpg, {
        x: (pageW - drawW) / 2,
        y: (pageH - drawH) / 2,
        width: drawW,
        height: drawH,
      });
    }
  }

  return mergedPdf.save();
};

export const packDocumentsIntoZipBlob = async (
  sources: readonly BinaryDocumentSource[]
): Promise<Blob> => {
  const { zipSync } = await import('fflate');
  const entries: Record<string, Uint8Array> = {};
  const usedNames = new Set<string>();

  for (const src of sources) {
    let candidateName = src.fileName;
    let counter = 2;
    while (usedNames.has(candidateName.toLowerCase())) {
      const dotIdx = src.fileName.lastIndexOf('.');
      if (dotIdx > 0) {
        candidateName = `${src.fileName.slice(0, dotIdx)}_${counter}${src.fileName.slice(dotIdx)}`;
      } else {
        candidateName = `${src.fileName}_${counter}`;
      }
      counter += 1;
    }
    usedNames.add(candidateName.toLowerCase());
    entries[candidateName] = src.bytes;
  }

  const zippedBytes = zipSync(entries, { level: 1 });
  const zipBuffer = new ArrayBuffer(zippedBytes.byteLength);
  new Uint8Array(zipBuffer).set(zippedBytes);
  return new Blob([zipBuffer], { type: 'application/zip' });
};

export const triggerBrowserDownload = (blob: Blob, fileName: string): void => {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
};
