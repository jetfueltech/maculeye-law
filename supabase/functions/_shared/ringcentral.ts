// Shared RingCentral helpers used by multiple edge functions.
// - getRcCredentials: read client id/secret/server URL from app_secrets
// - getValidAccessToken: read the user's token row, refreshing it if
//   it's within 5 minutes of expiry
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.95.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface RcCredentials {
  clientId: string;
  clientSecret: string;
  serverUrl: string;
}

export interface RcTokenRow {
  user_id: string;
  firm_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  refresh_token_expires_at: string | null;
  rc_account_id: string | null;
  rc_extension_id: string | null;
  rc_phone_number: string | null;
  callback_phone: string | null;
}

export function getServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export async function getRcCredentials(supabase: SupabaseClient): Promise<RcCredentials> {
  const { data } = await supabase
    .from("app_secrets")
    .select("key, value")
    .in("key", ["RINGCENTRAL_CLIENT_ID", "RINGCENTRAL_CLIENT_SECRET", "RINGCENTRAL_SERVER_URL"]);
  const map: Record<string, string> = {};
  for (const row of data || []) map[row.key] = row.value;
  return {
    clientId: map["RINGCENTRAL_CLIENT_ID"] || "",
    clientSecret: map["RINGCENTRAL_CLIENT_SECRET"] || "",
    serverUrl: map["RINGCENTRAL_SERVER_URL"] || "https://platform.devtest.ringcentral.com",
  };
}

/**
 * Returns a fresh access token for the user's RC connection, refreshing if needed.
 * Updates the database row if the token was refreshed.
 */
export async function getValidAccessToken(
  supabase: SupabaseClient,
  creds: RcCredentials,
  userId: string,
  firmId: string,
): Promise<{ token: RcTokenRow; accessToken: string } | { error: string }> {
  const { data: row, error } = await supabase
    .from("ringcentral_oauth_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("firm_id", firmId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!row) return { error: "No RingCentral connection found for this user." };

  const expiresAt = new Date(row.expires_at).getTime();
  const nowPlus5 = Date.now() + 5 * 60 * 1000;
  if (expiresAt > nowPlus5) {
    return { token: row, accessToken: row.access_token };
  }

  // Refresh.
  const basicAuth = btoa(`${creds.clientId}:${creds.clientSecret}`);
  const refreshRes = await fetch(`${creds.serverUrl}/restapi/oauth/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: row.refresh_token,
    }).toString(),
  });
  const body = await refreshRes.json();
  if (!refreshRes.ok) {
    return { error: body.error_description || body.error || "Token refresh failed." };
  }

  const newAccess = body.access_token as string;
  const newRefresh = (body.refresh_token as string) || row.refresh_token;
  const newExpiresIn = (body.expires_in as number) || 3600;
  const newRefreshExpiresIn = (body.refresh_token_expires_in as number) || 60 * 60 * 24 * 7;
  const newExpiresAt = new Date(Date.now() + newExpiresIn * 1000).toISOString();
  const newRefreshExpiresAt = new Date(Date.now() + newRefreshExpiresIn * 1000).toISOString();

  const { data: updated, error: updateErr } = await supabase
    .from("ringcentral_oauth_tokens")
    .update({
      access_token: newAccess,
      refresh_token: newRefresh,
      expires_at: newExpiresAt,
      refresh_token_expires_at: newRefreshExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("firm_id", firmId)
    .select()
    .maybeSingle();

  if (updateErr || !updated) {
    return { error: updateErr?.message || "Failed to persist refreshed token." };
  }

  return { token: updated as RcTokenRow, accessToken: newAccess };
}

/** Normalize an arbitrary phone string to E.164 where possible. Falls back to returning the raw value with a leading + if missing. */
export function toE164(raw: string, defaultCountry = "1"): string {
  if (!raw) return "";
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+${defaultCountry}${digits}`;
  if (digits.length === 11 && digits.startsWith(defaultCountry)) return `+${digits}`;
  return `+${digits}`;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};
