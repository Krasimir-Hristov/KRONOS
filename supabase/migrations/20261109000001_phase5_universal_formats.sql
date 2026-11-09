-- ============================================================================
-- KRONOS Phase 5A: Expand kronos-vault Storage Bucket Allowed MIME Types
-- Supports 15+ universal formats: PDF, Images (JPEG/JFIF, PNG, WebP, GIF, BMP,
-- AVIF, HEIC/HEIF), Web (HTML), Office (DOCX, XLSX, CSV), and Text (TXT, MD, JSON, XML).
-- ============================================================================

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/avif',
  'image/heic',
  'image/heif',
  'text/html',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/xml',
  'text/xml',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
WHERE id = 'kronos-vault';
