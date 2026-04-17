// Pulls recent RingCentral call logs and SMS messages into Supabase.
// Tries to auto-link each record to a case by matching the other party's
// phone number against case client/adjuster/contact numbers stored in the
// case's JSON.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, getRcCredentials, getServiceClient, getValidAccessToken } from "../_shared/ringcentral.ts";

const CALL_WINDOW_DAYS = 14;
const CALL_PAGE_SIZE = 250;
const SMS_PAGE_SIZE = 250;

function stripToDigits(s: string): string {
  return (s || "").replace(/\D/g, "");
}

function last10(s: string): string {
  const d = stripToDigits(s);
  return d.length > 10 ? d.slice(-10) : d;
}

/** Builds a lookup: phone-digits → case id by scanning the case.data JSON. */
function indexCasePhones(rows: { id: string; data: any }[]): Map<string, string> {
  const idx = new Map<string, string>();
  for (const row of rows) {
    const c = row.data || {};
    const phones: string[] = [];
    if (c.clientPhone) phones.push(c.clientPhone);
    if (c.extendedIntake?.client?.phones) {
      const p = c.extendedIntake.client.phones;
      if (p.cell) phones.push(p.cell);
      if (p.home) phones.push(p.home);
      if (p.work) phones.push(p.work);
    }
    for (const adj of c.adjusters || []) if (adj.phone) phones.push(adj.phone);
    for (const ins of c.insurance || []) {
      if (ins.claimsPhone) phones.push(ins.claimsPhone);
      for (const a of ins.adjusters || []) if (a.phone) phones.push(a.phone);
    }
    for (const p of phones) {
      const key = last10(p);
      if (key.length >= 7 && !idx.has(key)) idx.set(key, row.id);
    }
  }
  return idx;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const url = new URL(req.url);
    const firmId = payload.firm_id || url.searchParams.get("firm_id");
    const userId = payload.user_id || url.searchParams.get("user_id");
    if (!firmId || !userId) {
      return new Response(JSON.stringify({ error: "firm_id and user_id are required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceClient();
    const creds = await getRcCredentials(supabase);
    const tokenResult = await getValidAccessToken(supabase, creds, userId, firmId);
    if ("error" in tokenResult) {
      return new Response(JSON.stringify({ error: tokenResult.error }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const accessToken = tokenResult.accessToken;

    const dateFrom = new Date(Date.now() - CALL_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Build case-phone index once so we can link calls and SMS to cases.
    const { data: caseRows } = await supabase
      .from("cases")
      .select("id, data")
      .eq("firm_id", firmId);
    const phoneIdx = indexCasePhones(caseRows || []);

    // ── Call logs ───────────────────────────────────────────────────
    let callsSynced = 0;
    {
      const params = new URLSearchParams({
        dateFrom,
        perPage: String(CALL_PAGE_SIZE),
        view: "Detailed",
      });
      const res = await fetch(`${creds.serverUrl}/restapi/v1.0/account/~/extension/~/call-log?${params}`, {
        headers: { "Authorization": `Bearer ${accessToken}`, "Accept": "application/json" },
      });
      const body = await res.json();
      if (res.ok && Array.isArray(body.records)) {
        for (const rec of body.records) {
          const direction = rec.direction || "";
          const fromNum = rec.from?.phoneNumber || "";
          const toNum = rec.to?.phoneNumber || "";
          const counterparty = direction === "Outbound" ? toNum : fromNum;
          const caseId = phoneIdx.get(last10(counterparty)) || null;
          const recording = rec.recording?.contentUri || null;

          const { error } = await supabase.from("ringcentral_call_logs").upsert({
            firm_id: firmId,
            user_id: userId,
            rc_call_id: rec.id?.toString() || rec.sessionId?.toString() || `rc-${rec.startTime}`,
            direction: direction || "Unknown",
            result: rec.result || null,
            from_number: fromNum,
            from_name: rec.from?.name || null,
            to_number: toNum,
            to_name: rec.to?.name || null,
            duration_seconds: rec.duration || 0,
            recording_url: recording,
            started_at: rec.startTime || new Date().toISOString(),
            linked_case_id: caseId,
            raw: rec,
          }, { onConflict: "user_id,rc_call_id" });
          if (!error) callsSynced++;
        }
      }
    }

    // ── SMS messages ────────────────────────────────────────────────
    let smsSynced = 0;
    {
      const params = new URLSearchParams({
        messageType: "SMS",
        dateFrom,
        perPage: String(SMS_PAGE_SIZE),
      });
      const res = await fetch(`${creds.serverUrl}/restapi/v1.0/account/~/extension/~/message-store?${params}`, {
        headers: { "Authorization": `Bearer ${accessToken}`, "Accept": "application/json" },
      });
      const body = await res.json();
      if (res.ok && Array.isArray(body.records)) {
        for (const rec of body.records) {
          const direction = rec.direction === "Inbound" ? "Inbound" : "Outbound";
          const fromNum = rec.from?.phoneNumber || "";
          const toArray = Array.isArray(rec.to) ? rec.to : [];
          const toNum = toArray[0]?.phoneNumber || "";
          const counterparty = direction === "Outbound" ? toNum : fromNum;
          const caseId = phoneIdx.get(last10(counterparty)) || null;
          const readFlag = rec.readStatus === "Read";

          const { error } = await supabase.from("ringcentral_sms_messages").upsert({
            firm_id: firmId,
            user_id: userId,
            rc_message_id: rec.id?.toString() || `rc-${rec.creationTime}`,
            conversation_id: rec.conversation?.id?.toString() || null,
            direction,
            from_number: fromNum,
            to_number: toNum,
            body: rec.subject || "",
            message_status: rec.messageStatus || null,
            sent_at: rec.creationTime || new Date().toISOString(),
            linked_case_id: caseId,
            is_read: direction === "Outbound" ? true : readFlag,
            raw: rec,
          }, { onConflict: "user_id,rc_message_id" });
          if (!error) smsSynced++;
        }
      }
    }

    return new Response(JSON.stringify({
      calls: callsSynced,
      sms: smsSynced,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
