import { supabase } from './supabaseClient';
import type { Email, EmailAttachment, EmailThread } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface OutlookConnection {
  id: string;
  email_address: string;
  expires_at: string;
  updated_at: string;
}

export async function getOutlookConnection(firmId: string): Promise<OutlookConnection | null> {
  const { data } = await supabase
    .from('outlook_oauth_tokens')
    .select('id, email_address, expires_at, updated_at')
    .eq('firm_id', firmId)
    .maybeSingle();
  return data;
}

export async function startOutlookAuth(firmId: string, userId: string): Promise<string | null> {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/outlook-auth?firm_id=${firmId}&user_id=${userId}`,
    {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  const data = await res.json();
  return data.url || null;
}

export async function syncOutlookEmails(firmId: string): Promise<{ synced: number; attachments?: number; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { synced: 0, error: 'Not authenticated' };

  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/outlook-sync?firm_id=${firmId}`,
    {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  const data = await res.json();
  if (data.error) return { synced: 0, error: data.error };
  return { synced: data.synced || 0, attachments: data.attachments || 0 };
}

export async function disconnectOutlook(firmId: string): Promise<void> {
  await supabase
    .from('outlook_oauth_tokens')
    .delete()
    .eq('firm_id', firmId);
}

interface SyncedEmailRow {
  id: string;
  microsoft_id: string;
  conversation_id: string;
  from_name: string;
  from_email: string;
  to_recipients: string;
  subject: string;
  body_preview: string;
  body_html: string;
  direction: string;
  is_read: boolean;
  has_attachments: boolean;
  received_at: string;
  linked_case_id: string | null;
  category: string | null;
  ai_match: Record<string, unknown> | null;
  attachments_meta: Array<{ name: string; type: string; size: string }>;
}

interface AttachmentRow {
  id: string;
  email_id: string;
  name: string;
  content_type: string;
  size_bytes: number;
  storage_path: string;
}

function mapRowToEmail(row: SyncedEmailRow, dbAttachments?: AttachmentRow[]): Email {
  let attachments: EmailAttachment[];

  if (dbAttachments && dbAttachments.length > 0) {
    attachments = dbAttachments.map(a => ({
      name: a.name,
      type: (a.content_type?.includes('pdf') ? 'pdf' : a.content_type?.includes('image') ? 'image' : 'doc') as 'pdf' | 'image' | 'doc',
      size: formatFileSize(a.size_bytes),
      storagePath: a.storage_path,
      contentType: a.content_type,
      attachmentId: a.id,
    }));
  } else {
    attachments = (row.attachments_meta || []).map(a => ({
      name: a.name,
      type: (a.type?.includes('pdf') ? 'pdf' : a.type?.includes('image') ? 'image' : 'doc') as 'pdf' | 'image' | 'doc',
      size: a.size,
    }));
  }

  return {
    id: row.id,
    from: row.from_name || row.from_email,
    fromEmail: row.from_email,
    subject: row.subject,
    body: row.body_preview || stripHtml(row.body_html),
    bodyHtml: row.body_html || undefined,
    toRecipients: row.to_recipients || undefined,
    date: formatEmailDate(row.received_at),
    receivedAt: row.received_at,
    isRead: row.is_read,
    direction: (row.direction === 'outbound' ? 'outbound' : 'inbound') as 'inbound' | 'outbound',
    threadId: row.conversation_id || undefined,
    attachments,
    linkedCaseId: row.linked_case_id || undefined,
    category: row.category as Email['category'],
    aiMatch: row.ai_match ? {
      suggestedCaseId: (row.ai_match as Record<string, unknown>).suggestedCaseId as string | null,
      confidenceScore: (row.ai_match as Record<string, unknown>).confidenceScore as number,
      reasoning: (row.ai_match as Record<string, unknown>).reasoning as string,
    } : undefined,
  };
}

export async function getSyncedEmails(firmId: string): Promise<Email[]> {
  const { data, error } = await supabase
    .from('synced_emails')
    .select('*')
    .eq('firm_id', firmId)
    .order('received_at', { ascending: false })
    .limit(200);

  if (error || !data) return [];

  const emailIds = data.map((r: SyncedEmailRow) => r.id);
  const { data: attachmentRows } = await supabase
    .from('email_attachments')
    .select('*')
    .in('email_id', emailIds);

  const attachmentsByEmail = new Map<string, AttachmentRow[]>();
  for (const att of (attachmentRows || []) as AttachmentRow[]) {
    const existing = attachmentsByEmail.get(att.email_id) || [];
    existing.push(att);
    attachmentsByEmail.set(att.email_id, existing);
  }

  return (data as SyncedEmailRow[]).map(row =>
    mapRowToEmail(row, attachmentsByEmail.get(row.id))
  );
}

export function groupEmailsIntoThreads(emails: Email[]): EmailThread[] {
  const threadMap = new Map<string, Email[]>();

  for (const email of emails) {
    const key = email.threadId || email.id;
    const existing = threadMap.get(key) || [];
    existing.push(email);
    threadMap.set(key, existing);
  }

  const threads: EmailThread[] = [];

  for (const [threadId, messages] of threadMap) {
    messages.sort((a, b) => {
      const dateA = parseEmailDate(a.date);
      const dateB = parseEmailDate(b.date);
      return dateB - dateA;
    });

    const latest = messages[0];
    const participantSet = new Set<string>();
    let totalAttachments = 0;
    let hasAttachments = false;

    for (const m of messages) {
      participantSet.add(m.from);
      totalAttachments += m.attachments.length;
      if (m.attachments.length > 0) hasAttachments = true;
    }

    const linkedMsg = messages.find(m => m.linkedCaseId);
    const categorizedMsg = messages.find(m => m.category);

    threads.push({
      threadId,
      subject: latest.subject,
      participants: Array.from(participantSet),
      latestDate: latest.date,
      unreadCount: messages.filter(m => !m.isRead).length,
      messageCount: messages.length,
      messages,
      linkedCaseId: linkedMsg?.linkedCaseId,
      category: categorizedMsg?.category,
      hasAttachments,
      totalAttachments,
    });
  }

  threads.sort((a, b) => {
    const dateA = parseEmailDate(a.latestDate);
    const dateB = parseEmailDate(b.latestDate);
    return dateB - dateA;
  });

  return threads;
}

export async function getAttachmentDownloadUrl(storagePath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from('email-attachments')
    .createSignedUrl(storagePath, 3600);
  return data?.signedUrl || null;
}

export async function copyAttachmentToCaseDocuments(
  storagePath: string,
  caseId: string,
  fileName: string,
  contentType: string
): Promise<{ url: string; path: string } | { error: string }> {
  const { data: fileData, error: dlError } = await supabase.storage
    .from('email-attachments')
    .download(storagePath);

  if (dlError || !fileData) {
    return { error: dlError?.message || 'Failed to download attachment' };
  }

  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const destPath = `${caseId}/${timestamp}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('case-documents')
    .upload(destPath, fileData, {
      cacheControl: '3600',
      upsert: false,
      contentType: contentType || 'application/octet-stream',
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data: urlData } = supabase.storage
    .from('case-documents')
    .getPublicUrl(destPath);

  return { url: urlData.publicUrl, path: destPath };
}

export async function updateSyncedEmail(emailId: string, updates: {
  linked_case_id?: string | null;
  category?: string | null;
  ai_match?: Record<string, unknown> | null;
  is_read?: boolean;
}): Promise<void> {
  await supabase
    .from('synced_emails')
    .update(updates)
    .eq('id', emailId);
}

function parseEmailDate(dateStr: string): number {
  if (dateStr === 'Just Now') return Date.now();
  if (dateStr.endsWith('m ago')) {
    const mins = parseInt(dateStr);
    return Date.now() - mins * 60000;
  }
  if (dateStr === 'Yesterday') return Date.now() - 86400000;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function formatEmailDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just Now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 500);
}
