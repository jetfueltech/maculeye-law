import { supabase } from './supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface RingCentralConnection {
  id: string;
  rc_phone_number: string | null;
  callback_phone: string | null;
  owner_name: string | null;
  owner_email: string | null;
  expires_at: string;
  updated_at: string;
}

export interface RingCentralCallLog {
  id: string;
  rc_call_id: string;
  direction: 'Inbound' | 'Outbound' | string;
  result: string | null;
  from_number: string;
  from_name: string | null;
  to_number: string;
  to_name: string | null;
  duration_seconds: number;
  recording_url: string | null;
  started_at: string;
  linked_case_id: string | null;
}

export interface RingCentralSms {
  id: string;
  rc_message_id: string;
  conversation_id: string | null;
  direction: 'Inbound' | 'Outbound' | string;
  from_number: string;
  to_number: string;
  body: string;
  message_status: string | null;
  sent_at: string;
  linked_case_id: string | null;
  is_read: boolean;
}

// Use the anon key for the Authorization header (matches outlookService pattern).
// Supabase Edge Functions' gateway accepts the anon key as a valid JWT; user
// session tokens can be rejected depending on project config.
const edgeHeaders: Record<string, string> = {
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Apikey': SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
};

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error || body?.message || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

/** Fetch the current user's RingCentral connection row (null if not connected). */
export async function getRingCentralConnection(firmId: string, userId: string): Promise<RingCentralConnection | null> {
  const { data } = await supabase
    .from('ringcentral_oauth_tokens')
    .select('id, rc_phone_number, callback_phone, owner_name, owner_email, expires_at, updated_at')
    .eq('firm_id', firmId)
    .eq('user_id', userId)
    .maybeSingle();
  return data as RingCentralConnection | null;
}

/** Update the callback phone RC should ring first on click-to-call. */
export async function setRingCentralCallbackPhone(firmId: string, userId: string, phone: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('ringcentral_oauth_tokens')
    .update({ callback_phone: phone, updated_at: new Date().toISOString() })
    .eq('firm_id', firmId)
    .eq('user_id', userId);
  return { error: error?.message || null };
}

/** Kick off OAuth. Returns the RC authorize URL to open in a popup. */
export async function startRingCentralAuth(firmId: string, userId: string): Promise<{ url?: string; error?: string }> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/ringcentral-auth?firm_id=${firmId}&user_id=${userId}`,
      { headers: edgeHeaders },
    );
    if (!res.ok) return { error: await parseError(res) };
    const data = await res.json();
    if (!data.url) return { error: data.error || 'No auth URL returned.' };
    return { url: data.url };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/** Disconnect: delete the token row. */
export async function disconnectRingCentral(firmId: string, userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('ringcentral_oauth_tokens')
    .delete()
    .eq('firm_id', firmId)
    .eq('user_id', userId);
  return { error: error?.message || null };
}

/** Place a click-to-call via RingOut. RC will dial the user's RC number first, then bridge to `toNumber`. */
export async function placeRingOut(
  firmId: string,
  userId: string,
  toNumber: string,
  fromNumber?: string,
): Promise<{ id?: string; status?: string; error?: string }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ringcentral-ringout`, {
    method: 'POST',
    headers: edgeHeaders,
    body: JSON.stringify({ firm_id: firmId, user_id: userId, to_number: toNumber, from_number: fromNumber }),
  });
  const body = await res.json();
  if (!res.ok) return { error: body.error || 'RingOut failed.' };
  return { id: body.id?.toString?.(), status: body.status };
}

/** Send an SMS through RingCentral. */
export async function sendRingCentralSms(params: {
  firmId: string;
  userId: string;
  toNumber: string;
  body: string;
  fromNumber?: string;
  caseId?: string;
}): Promise<{ id?: string; error?: string }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ringcentral-sms`, {
    method: 'POST',
    headers: edgeHeaders,
    body: JSON.stringify({
      firm_id: params.firmId,
      user_id: params.userId,
      to_number: params.toNumber,
      body: params.body,
      from_number: params.fromNumber,
      case_id: params.caseId,
    }),
  });
  const body = await res.json();
  if (!res.ok) return { error: body.error || 'SMS send failed.' };
  return { id: body.id?.toString?.() };
}

/** Trigger a sync of RC call logs + SMS. */
export async function syncRingCentral(firmId: string, userId: string): Promise<{ calls: number; sms: number; error?: string }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ringcentral-sync`, {
    method: 'POST',
    headers: edgeHeaders,
    body: JSON.stringify({ firm_id: firmId, user_id: userId }),
  });
  const body = await res.json();
  if (!res.ok) return { calls: 0, sms: 0, error: body.error || 'Sync failed.' };
  return { calls: body.calls || 0, sms: body.sms || 0 };
}

/** Load call logs for a firm, optionally filtered to a case. */
export async function getRingCentralCallLogs(firmId: string, caseId?: string, limit = 100): Promise<RingCentralCallLog[]> {
  let q = supabase
    .from('ringcentral_call_logs')
    .select('id, rc_call_id, direction, result, from_number, from_name, to_number, to_name, duration_seconds, recording_url, started_at, linked_case_id')
    .eq('firm_id', firmId)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (caseId) q = q.eq('linked_case_id', caseId);
  const { data } = await q;
  return (data || []) as RingCentralCallLog[];
}

/** Load SMS for a firm, optionally filtered to a case. */
export async function getRingCentralSms(firmId: string, caseId?: string, limit = 200): Promise<RingCentralSms[]> {
  let q = supabase
    .from('ringcentral_sms_messages')
    .select('id, rc_message_id, conversation_id, direction, from_number, to_number, body, message_status, sent_at, linked_case_id, is_read')
    .eq('firm_id', firmId)
    .order('sent_at', { ascending: false })
    .limit(limit);
  if (caseId) q = q.eq('linked_case_id', caseId);
  const { data } = await q;
  return (data || []) as RingCentralSms[];
}

/** Link a call log or SMS to a specific case (manual re-link after sync). */
export async function linkCallToCase(callId: string, caseId: string | null): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('ringcentral_call_logs')
    .update({ linked_case_id: caseId })
    .eq('id', callId);
  return { error: error?.message || null };
}

export async function linkSmsToCase(smsId: string, caseId: string | null): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('ringcentral_sms_messages')
    .update({ linked_case_id: caseId })
    .eq('id', smsId);
  return { error: error?.message || null };
}
