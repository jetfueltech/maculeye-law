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
    const secrets = await getSecrets(["MICROSOFT_CLIENT_ID", "MICROSOFT_TENANT_ID"]);
    const clientId = secrets["MICROSOFT_CLIENT_ID"];
    const tenantId = secrets["MICROSOFT_TENANT_ID"];

    if (!clientId || !tenantId) {
      return new Response(
        JSON.stringify({ error: "Microsoft credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const firmId = url.searchParams.get("firm_id");
    const userId = url.searchParams.get("user_id");

    if (!firmId || !userId) {
      return new Response(
        JSON.stringify({ error: "firm_id and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const state = btoa(JSON.stringify({ firm_id: firmId, user_id: userId }));
    const redirectUri = `${SUPABASE_URL}/functions/v1/outlook-callback`;

    const scopes = [
      "openid",
      "profile",
      "email",
      "offline_access",
      "Mail.Read",
      "Mail.ReadWrite",
      "User.Read",
    ];

    const authUrl = new URL(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`
    );
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scopes.join(" "));
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("response_mode", "query");
    authUrl.searchParams.set("prompt", "consent");

    return new Response(JSON.stringify({ url: authUrl.toString() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
