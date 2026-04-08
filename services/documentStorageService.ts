import { supabase } from './supabaseClient';

const BUCKET = 'case-documents';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function uploadDocument(
  caseId: string,
  file: File
): Promise<{ url: string; path: string } | { error: string }> {
  const timestamp = Date.now();
  const safeName = sanitizeFilename(file.name);
  const path = `${caseId}/${timestamp}_${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

  if (error) {
    return { error: error.message };
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  return { url: urlData.publicUrl, path };
}

export async function deleteDocument(path: string): Promise<{ error?: string }> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([path]);

  if (error) {
    return { error: error.message };
  }
  return {};
}

export function getPublicUrl(path: string): string {
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bstr = atob(parts[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

export async function uploadBase64Document(
  caseId: string,
  fileData: string,
  fileName: string,
  mimeType?: string
): Promise<{ url: string; path: string } | { error: string }> {
  const timestamp = Date.now();
  const safeName = sanitizeFilename(fileName);
  const path = `${caseId}/${timestamp}_${safeName}`;

  const blob = dataUrlToBlob(fileData);
  const contentType = mimeType || blob.type || 'application/octet-stream';

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType,
    });

  if (error) {
    return { error: error.message };
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  return { url: urlData.publicUrl, path };
}
