// RingCentral OAuth entry point.
// Client calls this to get a RingCentral authorize URL with firm_id + user_id
// encoded in `state`. After the user approves on RC, RC redirects back to
// ringcentral-callback.
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
  const { data } = await supabase
    .from("app_secrets")
    .select("key, value")
    .in("key", keys);
  const result: Record<string, string> = {};
  for (const row of data || []) result[row.key] = row.value;
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const secrets = await getSecrets([
      "RINGCENTRAL_CLIENT_ID",
      "RINGCENTRAL_SERVER_URL",
    ]);
    const clientId = secrets["RINGCENTRAL_CLIENT_ID"];
    const serverUrl = secrets["RINGCENTRAL_SERVER_URL"] || "https://platform.devtest.ringcentral.com";

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "RingCentral credentials not configured. Set RINGCENTRAL_CLIENT_ID in app_secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const url = new URL(req.url);
    const firmId = url.searchParams.get("firm_id");
    const userId = url.searchParams.get("user_id");
    if (!firmId || !userId) {
      return new Response(
        JSON.stringify({ error: "firm_id and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const state = btoa(JSON.stringify({ firm_id: firmId, user_id: userId }));
    const redirectUri = `${SUPABASE_URL}/functions/v1/ringcentral-callback`;

    const authUrl = new URL(`${serverUrl}/restapi/oauth/authorize`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("prompt", "login sso");

    return new Response(JSON.stringify({ url: authUrl.toString() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
