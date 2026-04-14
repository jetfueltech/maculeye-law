import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
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

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  tenantId: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
} | null> {
  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope:
          "openid profile email offline_access Mail.Read Mail.ReadWrite Mail.Send User.Read",
      }),
    }
  );
  const data = await res.json();
  if (data.error) return null;
  return data;
}

interface SendEmailPayload {
  to: string[];
  cc?: string[];
  subject: string;
  bodyHtml: string;
  replyToMessageId?: string;
  firmId: string;
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
        JSON.stringify({ error: "Microsoft credentials not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: SendEmailPayload = await req.json();
    const { to, cc, subject, bodyHtml, replyToMessageId, firmId } = payload;

    if (!firmId || !to || to.length === 0 || !subject) {
      return new Response(
        JSON.stringify({ error: "to, subject, and firmId are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from("outlook_oauth_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("firm_id", firmId)
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return new Response(
        JSON.stringify({ error: "No Outlook connection found. Please connect first." }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let accessToken = tokenRow.access_token;
    const now = new Date();
    const expiresAt = new Date(tokenRow.expires_at);

    if (now >= expiresAt) {
      const refreshed = await refreshAccessToken(
        tokenRow.refresh_token,
        clientId,
        clientSecret,
        tenantId
      );
      if (!refreshed) {
        await supabaseAdmin
          .from("outlook_oauth_tokens")
          .delete()
          .eq("id", tokenRow.id);
        return new Response(
          JSON.stringify({ error: "Token expired. Please reconnect Outlook." }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      accessToken = refreshed.access_token;
      const newExpiry = new Date(
        Date.now() + refreshed.expires_in * 1000
      ).toISOString();

      await supabaseAdmin
        .from("outlook_oauth_tokens")
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          expires_at: newExpiry,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tokenRow.id);
    }

    const toRecipients = to.map((addr) => ({
      emailAddress: { address: addr.trim() },
    }));

    const ccRecipients = (cc || [])
      .filter((addr) => addr.trim().length > 0)
      .map((addr) => ({
        emailAddress: { address: addr.trim() },
      }));

    const message: Record<string, unknown> = {
      subject,
      body: {
        contentType: "HTML",
        content: bodyHtml,
      },
      toRecipients,
    };

    if (ccRecipients.length > 0) {
      message.ccRecipients = ccRecipients;
    }

    let graphUrl: string;
    let graphBody: unknown;

    if (replyToMessageId) {
      const { data: originalRow } = await supabaseAdmin
        .from("synced_emails")
        .select("microsoft_id")
        .eq("id", replyToMessageId)
        .maybeSingle();

      const microsoftId = originalRow?.microsoft_id;
      if (microsoftId) {
        graphUrl = `https://graph.microsoft.com/v1.0/me/messages/${microsoftId}/reply`;
        graphBody = {
          message: {
            toRecipients,
            ccRecipients: ccRecipients.length > 0 ? ccRecipients : undefined,
          },
          comment: bodyHtml,
        };
      } else {
        graphUrl = "https://graph.microsoft.com/v1.0/me/sendMail";
        graphBody = { message, saveToSentItems: true };
      }
    } else {
      graphUrl = "https://graph.microsoft.com/v1.0/me/sendMail";
      graphBody = { message, saveToSentItems: true };
    }

    const sendRes = await fetch(graphUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(graphBody),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      return new Response(
        JSON.stringify({ error: `Failed to send: ${errText}` }),
        {
          status: sendRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const connectedEmail = tokenRow.email_address?.toLowerCase() || "";
    const toList = to.join(", ");

    await supabaseAdmin.from("synced_emails").insert({
      firm_id: firmId,
      user_id: user.id,
      microsoft_id: `sent_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      conversation_id: replyToMessageId
        ? (await supabaseAdmin
            .from("synced_emails")
            .select("conversation_id")
            .eq("id", replyToMessageId)
            .maybeSingle()
          ).data?.conversation_id || ""
        : "",
      from_name: connectedEmail.split("@")[0] || "Me",
      from_email: connectedEmail,
      to_recipients: toList,
      subject,
      body_preview: bodyHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 500),
      body_html: bodyHtml,
      direction: "outbound",
      is_read: true,
      has_attachments: false,
      received_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
