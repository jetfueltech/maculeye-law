// RingOut: bridges a two-leg call.
//   Leg 1 — RC calls `from.phoneNumber` (the user's personal phone, e.g. cell)
//   Leg 2 — when the user answers, RC bridges to `to.phoneNumber` (the contact)
// The recipient sees `callerId.phoneNumber` (the firm's RC DID) on their phone.
//
// POST body: { firm_id, user_id, to_number, callback_phone?, caller_id? }
//   - callback_phone defaults to tokens.callback_phone, else tokens.rc_phone_number.
//   - caller_id defaults to tokens.rc_phone_number.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, getRcCredentials, getServiceClient, getValidAccessToken, toE164 } from "../_shared/ringcentral.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    const {
      firm_id: firmId,
      user_id: userId,
      to_number: toRaw,
      callback_phone: callbackRaw,
      caller_id: callerIdRaw,
    } = payload || {};
    if (!firmId || !userId || !toRaw) {
      return new Response(JSON.stringify({ error: "firm_id, user_id, and to_number are required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceClient();
    const creds = await getRcCredentials(supabase);
    if (!creds.clientId || !creds.clientSecret) {
      return new Response(JSON.stringify({ error: "RingCentral is not configured." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenResult = await getValidAccessToken(supabase, creds, userId, firmId);
    if ("error" in tokenResult) {
      return new Response(JSON.stringify({ error: tokenResult.error }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toNumber = toE164(toRaw);
    const callbackPhone = toE164(callbackRaw || tokenResult.token.callback_phone || "");
    const callerId = toE164(callerIdRaw || tokenResult.token.rc_phone_number || "");

    if (!callbackPhone) {
      return new Response(JSON.stringify({
        error: "No callback phone configured. Open Settings → Integrations → RingCentral and enter the phone you want RC to ring first (your cell or desk phone).",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST /restapi/v1.0/account/~/extension/~/ring-out
    const rcRes = await fetch(`${creds.serverUrl}/restapi/v1.0/account/~/extension/~/ring-out`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokenResult.accessToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        from: { phoneNumber: callbackPhone },
        to: { phoneNumber: toNumber },
        ...(callerId ? { callerId: { phoneNumber: callerId } } : {}),
        playPrompt: false,
      }),
    });
    const body = await rcRes.json().catch(() => ({}));
    if (!rcRes.ok) {
      return new Response(JSON.stringify({
        error: body?.message || body?.error_description || `RingOut failed (HTTP ${rcRes.status}).`,
        details: body,
      }), { status: rcRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      id: body.id,
      status: body.status,
      from: callbackPhone,
      to: toNumber,
      callerId,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
