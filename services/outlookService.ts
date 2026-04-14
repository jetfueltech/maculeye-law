import { supabase } from './supabaseClient';
import type { Email, EmailAttachment } from '../types';

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

export async function syncOutlookEmails(firmId: string): Promise<{ synced: number; error?: string }> {
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
  return { synced: data.synced || 0 };
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

export async function getSyncedEmails(firmId: string): Promise<Email[]> {
  const { data, error } = await supabase
    .from('synced_emails')
    .select('*')
    .eq('firm_id', firmId)
    .order('received_at', { ascending: false })
    .limit(100);

  if (error || !data) return [];

  return (data as SyncedEmailRow[]).map(row => {
    const attachments: EmailAttachment[] = (row.attachments_meta || []).map(a => ({
      name: a.name,
      type: (a.type?.includes('pdf') ? 'pdf' : a.type?.includes('image') ? 'image' : 'doc') as 'pdf' | 'image' | 'doc',
      size: a.size,
    }));

    const dateStr = formatEmailDate(row.received_at);

    return {
      id: row.id,
      from: row.from_name || row.from_email,
      fromEmail: row.from_email,
      subject: row.subject,
      body: row.body_preview || stripHtml(row.body_html),
      date: dateStr,
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
  });
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

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 500);
}
