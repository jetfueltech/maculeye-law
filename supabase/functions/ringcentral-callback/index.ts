// RingCentral OAuth callback. RC redirects here with ?code=...&state=...
// We exchange the code for tokens, fetch the user's extension info, and
// persist everything to ringcentral_oauth_tokens. Then we show a tiny HTML
// page that postMessages the opener and auto-closes.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function getSecrets(keys: string[]): Promise<Record<string, string>> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await supabase.from("app_secrets").select("key, value").in("key", keys);
  const out: Record<string, string> = {};
  for (const row of data || []) out[row.key] = row.value;
  return out;
}

function closingHtml(ok: boolean, messageOrError: string): string {
  const safe = messageOrError.replace(/</g, "&lt;");
  return `<!doctype html><html><head><meta charset="utf-8"><title>RingCentral</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:${ok ? "#ecfdf5" : "#fef2f2"};color:${ok ? "#065f46" : "#991b1b"};text-align:center;padding:24px}h1{font-size:20px;margin:8px 0}p{font-size:13px;max-width:380px}</style></head>
<body><div><h1>${ok ? "✓ RingCentral Connected" : "RingCentral connection failed"}</h1><p>${safe}</p><p style="color:#78716c;margin-top:16px">This window will close automatically.</p></div>
<script>
try { window.opener && window.opener.postMessage({ type: 'ringcentral_connected', ok: ${ok} }, '*'); } catch (e) {}
setTimeout(function(){ window.close(); }, 900);
</script></body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const secrets = await getSecrets([
      "RINGCENTRAL_CLIENT_ID",
      "RINGCENTRAL_CLIENT_SECRET",
      "RINGCENTRAL_SERVER_URL",
    ]);
    const clientId = secrets["RINGCENTRAL_CLIENT_ID"];
    const clientSecret = secrets["RINGCENTRAL_CLIENT_SECRET"];
    const serverUrl = secrets["RINGCENTRAL_SERVER_URL"] || "https://platform.devtest.ringcentral.com";

    if (!clientId || !clientSecret) {
      return new Response(closingHtml(false, "RingCentral credentials missing from app_secrets."), {
        status: 500, headers: { "Content-Type": "text/html" },
      });
    }

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateRaw = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    if (error) {
      return new Response(closingHtml(false, error), { status: 400, headers: { "Content-Type": "text/html" } });
    }
    if (!code || !stateRaw) {
      return new Response(closingHtml(false, "Missing code or state."), {
        status: 400, headers: { "Content-Type": "text/html" },
      });
    }

    let firmId = "", userId = "";
    try {
      const parsed = JSON.parse(atob(stateRaw));
      firmId = parsed.firm_id;
      userId = parsed.user_id;
    } catch {
      return new Response(closingHtml(false, "Invalid state."), {
        status: 400, headers: { "Content-Type": "text/html" },
      });
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/ringcentral-callback`;
    const basicAuth = btoa(`${clientId}:${clientSecret}`);

    // 1. Exchange authorization code for access+refresh tokens.
    const tokenRes = await fetch(`${serverUrl}/restapi/oauth/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      return new Response(closingHtml(false, tokenJson.error_description || tokenJson.error || "Token exchange failed."), {
        status: 400, headers: { "Content-Type": "text/html" },
      });
    }

    const accessToken: string = tokenJson.access_token;
    const refreshToken: string = tokenJson.refresh_token;
    const expiresInSec: number = tokenJson.expires_in || 3600;
    const refreshExpiresInSec: number = tokenJson.refresh_token_expires_in || 60 * 60 * 24 * 7; // RC default 7d
    const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();
    const refreshExpiresAt = new Date(Date.now() + refreshExpiresInSec * 1000).toISOString();
    const ownerId: string | undefined = tokenJson.owner_id;
    const accountId: string | undefined = tokenJson.account_id;

    // 2. Fetch extension info (phone number, name, email).
    let phoneNumber = "";
    let ownerName = "";
    let ownerEmail = "";
    try {
      const extRes = await fetch(`${serverUrl}/restapi/v1.0/account/~/extension/~`, {
        headers: { "Authorization": `Bearer ${accessToken}`, "Accept": "application/json" },
      });
      if (extRes.ok) {
        const ext = await extRes.json();
        ownerName = [ext.contact?.firstName, ext.contact?.lastName].filter(Boolean).join(" ").trim();
        ownerEmail = ext.contact?.email || "";
      }
      const phoneRes = await fetch(`${serverUrl}/restapi/v1.0/account/~/extension/~/phone-number`, {
        headers: { "Authorization": `Bearer ${accessToken}`, "Accept": "application/json" },
      });
      if (phoneRes.ok) {
        const phones = await phoneRes.json();
        const direct = (phones.records || []).find((p: any) =>
          (p.usageType === "DirectNumber" || p.usageType === "MainCompanyNumber") &&
          (p.features || []).includes("SmsSender")
        ) || (phones.records || [])[0];
        if (direct?.phoneNumber) phoneNumber = direct.phoneNumber;
      }
    } catch {
      // Non-fatal: we still saved the tokens.
    }

    // 3. Upsert tokens row.
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: upsertErr } = await supabase
      .from("ringcentral_oauth_tokens")
      .upsert({
        user_id: userId,
        firm_id: firmId,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        refresh_token_expires_at: refreshExpiresAt,
        rc_account_id: accountId || null,
        rc_extension_id: ownerId || null,
        rc_phone_number: phoneNumber || null,
        owner_name: ownerName || null,
        owner_email: ownerEmail || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,firm_id" });

    if (upsertErr) {
      return new Response(closingHtml(false, `Save failed: ${upsertErr.message}`), {
        status: 500, headers: { "Content-Type": "text/html" },
      });
    }

    return new Response(closingHtml(true, `Connected ${ownerName || phoneNumber || "RingCentral"}.`), {
      status: 200, headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    return new Response(closingHtml(false, (err as Error).message), {
      status: 500, headers: { "Content-Type": "text/html" },
    });
  }
});
