// Sends SMS via RingCentral.
// POST body: { firm_id, user_id, to_number, body, from_number?, case_id? }
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
    const { firm_id: firmId, user_id: userId, to_number: toRaw, body: text, from_number: fromRaw, case_id: caseId } = payload || {};
    if (!firmId || !userId || !toRaw || !text) {
      return new Response(JSON.stringify({ error: "firm_id, user_id, to_number, and body are required." }), {
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
    const fromNumber = toE164(fromRaw || tokenResult.token.rc_phone_number || "");
    if (!fromNumber) {
      return new Response(JSON.stringify({ error: "No RingCentral 'from' number available." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /restapi/v1.0/account/~/extension/~/sms
    const rcRes = await fetch(`${creds.serverUrl}/restapi/v1.0/account/~/extension/~/sms`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokenResult.accessToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        from: { phoneNumber: fromNumber },
        to: [{ phoneNumber: toNumber }],
        text,
      }),
    });
    const body = await rcRes.json();
    if (!rcRes.ok) {
      return new Response(JSON.stringify({
        error: body?.message || body?.error_description || "SMS send failed.",
        details: body,
      }), { status: rcRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Persist the sent message so it shows up immediately in the app
    // without waiting for the next sync cycle.
    const conversationId = body.conversation?.id?.toString() || null;
    const sentAt = body.creationTime || new Date().toISOString();
    await supabase.from("ringcentral_sms_messages").upsert({
      firm_id: firmId,
      user_id: userId,
      rc_message_id: body.id?.toString() || `${Date.now()}`,
      conversation_id: conversationId,
      direction: "Outbound",
      from_number: fromNumber,
      to_number: toNumber,
      body: text,
      message_status: body.messageStatus || "Sent",
      sent_at: sentAt,
      linked_case_id: caseId || null,
      is_read: true,
      raw: body,
    }, { onConflict: "user_id,rc_message_id" });

    return new Response(JSON.stringify({
      id: body.id,
      status: body.messageStatus,
      from: fromNumber,
      to: toNumber,
      sent_at: sentAt,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
