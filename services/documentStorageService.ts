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
