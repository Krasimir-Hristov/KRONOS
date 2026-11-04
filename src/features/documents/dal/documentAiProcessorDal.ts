import 'server-only';
import { requireAuthAndPin } from '@/features/auth/server';
import {
  createVaultSignedDownloadUrl,
  downloadVaultObjectBytes,
} from '@/features/storage/server';
import { extractDocumentWithVisionOcr } from '@/lib/ai/documentOcrService';
import {
  buildDocumentEmbeddingInput,
  generateTextEmbedding,
} from '@/lib/ai/embeddingService';
import { createServerSupabaseClient } from '@/lib/supabase/supabaseServer';
import type { Json } from '@/types/databaseTypes';

const INLINE_OCR_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export interface ProcessDocumentAiOutcome {
  readonly documentId: string;
  readonly status: 'completed' | 'failed';
  readonly aiError: string | null;
}

export const processQueuedDocumentOcrAndRag = async (
  documentId: string
): Promise<ProcessDocumentAiOutcome> => {
  const { userId } = await requireAuthAndPin({ redirectOnFail: false });
  const supabase = await createServerSupabaseClient();

  const { data: doc, error: fetchErr } = await supabase
    .from('documents')
    .select(
      'id, title, storage_path, original_file_name, mime_type, file_size_bytes'
    )
    .eq('id', documentId)
    .eq('owner_id', userId)
    .single();

  if (fetchErr || !doc) {
    throw new Error('Документът за обработка не беше намерен.');
  }

  await supabase
    .from('documents')
    .update({ processing_status: 'processing' })
    .eq('id', doc.id)
    .eq('owner_id', userId);

  try {
    const ocrSource =
      doc.file_size_bytes <= INLINE_OCR_MAX_BYTES
        ? {
            fileName: doc.original_file_name,
            mimeType: doc.mime_type,
            bytes: (await downloadVaultObjectBytes(doc.storage_path)).bytes,
          }
        : {
            fileName: doc.original_file_name,
            mimeType: doc.mime_type,
            signedUrl: (await createVaultSignedDownloadUrl(doc.storage_path, 120))
              .signedUrl,
          };

    const ocrResult = await extractDocumentWithVisionOcr(ocrSource);

    let serializedVector: string | null = null;
    try {
      const embeddingInput = buildDocumentEmbeddingInput({
        title: ocrResult.title,
        topic: ocrResult.topic,
        sender: ocrResult.sender,
        docDate: ocrResult.docDate,
        summaryText: ocrResult.summaryText,
        rawOcrText: ocrResult.rawOcrText,
      });
      serializedVector = await generateTextEmbedding(embeddingInput);
    } catch {
      // Graceful fallback: OCR succeeded even if embedding call failed temporarily
      serializedVector = null;
    }

    const updatedMeta: Json = {
      pendingReview: true,
      suggestedFacts: ocrResult.suggestedFacts.map((f) => ({
        label: f.label,
        value: f.value,
        category: f.category,
        hint: f.hint ?? null,
      })),
      aiError: null,
    };

    const { error: updateErr } = await supabase
      .from('documents')
      .update({
        title: ocrResult.title,
        topic: ocrResult.topic,
        doc_type: ocrResult.docType,
        sender: ocrResult.sender,
        doc_date: ocrResult.docDate,
        expires_at: ocrResult.expiresAt,
        summary_text: ocrResult.summaryText,
        raw_ocr_text: ocrResult.rawOcrText,
        embedding: serializedVector,
        processing_status: 'completed',
        metadata: updatedMeta,
      })
      .eq('id', doc.id)
      .eq('owner_id', userId);

    if (updateErr) {
      throw new Error('Грешка при записване на извлечените OCR данни.');
    }

    return { documentId: doc.id, status: 'completed', aiError: null };
  } catch (err) {
    const friendlyError =
      err instanceof Error
        ? err.message
        : 'AI OCR услугата е временно недостъпна. Можете да попълните и одобрите документа ръчно.';

    const fallbackMeta: Json = {
      pendingReview: true,
      suggestedFacts: [],
      aiError: friendlyError,
    };

    await supabase
      .from('documents')
      .update({
        processing_status: 'failed',
        metadata: fallbackMeta,
      })
      .eq('id', doc.id)
      .eq('owner_id', userId);

    return {
      documentId: doc.id,
      status: 'failed',
      aiError: friendlyError,
    };
  }
};
