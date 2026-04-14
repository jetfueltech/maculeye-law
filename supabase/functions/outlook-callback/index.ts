import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function getSecrets(keys: string[]): Promise<Record<string, string>> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await supabase
    .from("app_secrets")
    .select("key, value")
    .in("key", keys);
  const result: Record<string, string> = {};
  for (const row of data || []) {
    result[row.key] = row.value;
  }
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const secrets = await getSecrets([
      "MICROSOFT_CLIENT_ID",
      "MICROSOFT_CLIENT_SECRET",
      "MICROSOFT_TENANT_ID",
    ]);
    const clientId = secrets["MICROSOFT_CLIENT_ID"];
    const clientSecret = secrets["MICROSOFT_CLIENT_SECRET"];
    const tenantId = secrets["MICROSOFT_TENANT_ID"];

    if (!clientId || !clientSecret || !tenantId) {
      return new Response(
        buildHTML(false, "Microsoft credentials not configured on server."),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    if (error) {
      return new Response(
        buildHTML(false, `Microsoft denied access: ${errorDescription || error}`),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    if (!code || !stateParam) {
      return new Response(
        buildHTML(false, "Missing authorization code or state."),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    let stateData: { firm_id: string; user_id: string };
    try {
      stateData = JSON.parse(atob(stateParam));
    } catch {
      return new Response(
        buildHTML(false, "Invalid state parameter."),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/outlook-callback`;

    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          scope: "openid profile email offline_access Mail.Read Mail.ReadWrite User.Read",
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return new Response(
        buildHTML(false, `Token exchange failed: ${tokenData.error_description || tokenData.error}`),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    let emailAddress = "";
    try {
      const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const profileData = await profileRes.json();
      emailAddress = profileData.mail || profileData.userPrincipalName || "";
    } catch {
      // non-critical
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: upsertError } = await supabaseAdmin
      .from("outlook_oauth_tokens")
      .upsert(
        {
          user_id: stateData.user_id,
          firm_id: stateData.firm_id,
          access_token,
          refresh_token,
          expires_at: expiresAt,
          email_address: emailAddress,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,firm_id" }
      );

    if (upsertError) {
      return new Response(
        buildHTML(false, `Failed to save tokens: ${upsertError.message}`),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    return new Response(
      buildHTML(true, `Connected ${emailAddress || "your Outlook account"} successfully!`),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  } catch (err) {
    return new Response(
      buildHTML(false, `Unexpected error: ${(err as Error).message}`),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  }
});

function buildHTML(success: boolean, message: string): string {
  const color = success ? "#16a34a" : "#dc2626";
  const icon = success ? "&#10003;" : "&#10007;";
  return `<!DOCTYPE html>
<html>
<head>
  <title>Outlook Connection</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f4; }
    .card { background: white; border-radius: 16px; padding: 48px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 400px; }
    .icon { font-size: 48px; color: ${color}; margin-bottom: 16px; }
    h1 { font-size: 20px; color: #1c1917; margin: 0 0 12px; }
    p { color: #78716c; font-size: 14px; margin: 0 0 24px; }
    .btn { display: inline-block; padding: 10px 24px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${success ? "Connected!" : "Connection Failed"}</h1>
    <p>${message}</p>
    <a class="btn" href="javascript:window.close()">Close This Window</a>
  </div>
  <script>
    ${success ? 'if(window.opener){window.opener.postMessage({type:"outlook_connected"},"*")}' : ''}
    setTimeout(()=>{window.close()},${success ? 3000 : 10000});
  </script>
</body>
</html>`;
}
