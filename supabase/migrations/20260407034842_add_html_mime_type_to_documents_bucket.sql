/*
  # Add HTML MIME type to documents bucket

  1. Changes
    - Add 'text/html' to allowed_mime_types for case-documents bucket
    - This allows storing generated form documents as HTML files

  2. Notes
    - Existing MIME types are preserved
    - HTML files are used for generated legal documents (LORs, FOIA requests, etc.)
*/

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/html'
]
WHERE id = 'case-documents';
