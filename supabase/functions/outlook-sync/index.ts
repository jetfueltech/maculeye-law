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

interface GraphMessage {
  id: string;
  conversationId?: string;
  from?: { emailAddress?: { name?: string; address?: string } };
  toRecipients?: Array<{ emailAddress?: { name?: string; address?: string } }>;
  subject?: string;
  bodyPreview?: string;
  body?: { content?: string; contentType?: string };
  isRead?: boolean;
  hasAttachments?: boolean;
  receivedDateTime?: string;
}

interface GraphAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  contentBytes?: string;
  "@odata.type"?: string;
}

interface GraphResponse {
  value?: GraphMessage[];
  "@odata.nextLink"?: string;
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
          "openid profile email offline_access Mail.Read Mail.ReadWrite User.Read",
      }),
    }
  );
  const data = await res.json();
  if (data.error) return null;
  return data;
}

async function fetchAllMessages(
  accessToken: string,
  sinceDate: string
): Promise<GraphMessage[]> {
  const allMessages: GraphMessage[] = [];
  const filter = `receivedDateTime ge ${sinceDate}`;
  const select =
    "id,conversationId,from,toRecipients,subject,bodyPreview,body,isRead,hasAttachments,receivedDateTime";

  let url: string | null =
    `https://graph.microsoft.com/v1.0/me/messages?$top=100&$orderby=receivedDateTime desc&$filter=${encodeURIComponent(filter)}&$select=${select}`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Graph API ${res.status}: ${errText}`);
    }

    const data: GraphResponse = await res.json();
    const messages = data.value || [];
    allMessages.push(...messages);

    url = data["@odata.nextLink"] || null;

    if (allMessages.length >= 500) break;
  }

  return allMessages;
}

async function fetchAttachments(
  accessToken: string,
  messageId: string
): Promise<GraphAttachment[]> {
  const listRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments?$select=id,name,contentType,size,microsoft.graph.fileAttachment/contentBytes`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!listRes.ok) return [];
  const listData = await listRes.json();
  const items = (listData.value || []).filter(
    (a: GraphAttachment) =>
      a["@odata.type"] === "#microsoft.graph.fileAttachment"
  );

  const results: GraphAttachment[] = [];
  for (const item of items) {
    if (item.contentBytes) {
      results.push(item);
      continue;
    }
    const detailRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments/${item.id}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!detailRes.ok) continue;
    const detail: GraphAttachment = await detailRes.json();
    if (detail.contentBytes) {
      results.push(detail);
    }
  }
  return results;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
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

    const url = new URL(req.url);
    const firmId = url.searchParams.get("firm_id");
    if (!firmId) {
      return new Response(
        JSON.stringify({ error: "firm_id is required" }),
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
        JSON.stringify({
          error: "No Outlook connection found. Please connect first.",
        }),
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
          JSON.stringify({
            error:
              "Token expired and refresh failed. Please reconnect Outlook.",
          }),
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

    const { count } = await supabaseAdmin
      .from("synced_emails")
      .select("id", { count: "exact", head: true })
      .eq("firm_id", firmId)
      .eq("user_id", user.id);

    const isInitialSync = (count ?? 0) === 0;

    let sinceDate: string;
    if (isInitialSync) {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      sinceDate = d.toISOString();
    } else {
      const { data: latestEmail } = await supabaseAdmin
        .from("synced_emails")
        .select("received_at")
        .eq("firm_id", firmId)
        .eq("user_id", user.id)
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestEmail?.received_at) {
        sinceDate = latestEmail.received_at;
      } else {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        sinceDate = d.toISOString();
      }
    }

    const messages = await fetchAllMessages(accessToken, sinceDate);

    const connectedEmail = tokenRow.email_address?.toLowerCase() || "";

    const messagesWithAttachments = messages.filter((m) => m.hasAttachments);

    const attachmentMap = new Map<
      string,
      Array<{ name: string; type: string; size: string; graphAttachment: GraphAttachment }>
    >();

    for (const msg of messagesWithAttachments) {
      const graphAtts = await fetchAttachments(accessToken, msg.id);
      if (graphAtts.length > 0) {
        attachmentMap.set(
          msg.id,
          graphAtts.map((a) => ({
            name: a.name,
            type: a.contentType,
            size: formatFileSize(a.size),
            graphAttachment: a,
          }))
        );
      }
    }

    const emailRows = messages.map((msg) => {
      const fromEmail =
        msg.from?.emailAddress?.address?.toLowerCase() || "";
      const direction = fromEmail === connectedEmail ? "outbound" : "inbound";

      const toList = (msg.toRecipients || [])
        .map((r) => r.emailAddress?.address || "")
        .filter(Boolean)
        .join(", ");

      const atts = attachmentMap.get(msg.id) || [];
      const attsMeta = atts.map((a) => ({
        name: a.name,
        type: a.type,
        size: a.size,
      }));

      return {
        firm_id: firmId,
        user_id: user.id,
        microsoft_id: msg.id,
        conversation_id: msg.conversationId || "",
        from_name: msg.from?.emailAddress?.name || "",
        from_email: fromEmail,
        to_recipients: toList,
        subject: msg.subject || "(No Subject)",
        body_preview: (msg.bodyPreview || "").substring(0, 500),
        body_html: msg.body?.content || "",
        direction,
        is_read: msg.isRead ?? false,
        has_attachments: msg.hasAttachments ?? false,
        received_at: msg.receivedDateTime || new Date().toISOString(),
        attachments_meta: attsMeta,
      };
    });

    if (emailRows.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < emailRows.length; i += batchSize) {
        const batch = emailRows.slice(i, i + batchSize);
        const { error: insertError } = await supabaseAdmin
          .from("synced_emails")
          .upsert(batch, {
            onConflict: "microsoft_id",
            ignoreDuplicates: false,
          });

        if (insertError) {
          return new Response(
            JSON.stringify({
              error: `Failed to save emails: ${insertError.message}`,
              synced: i,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
    }

    let attachmentsSaved = 0;
    for (const msg of messagesWithAttachments) {
      const atts = attachmentMap.get(msg.id);
      if (!atts || atts.length === 0) continue;

      const { data: emailRow } = await supabaseAdmin
        .from("synced_emails")
        .select("id")
        .eq("microsoft_id", msg.id)
        .maybeSingle();

      if (!emailRow) continue;

      const { count: existingCount } = await supabaseAdmin
        .from("email_attachments")
        .select("id", { count: "exact", head: true })
        .eq("email_id", emailRow.id);

      if ((existingCount ?? 0) > 0) continue;

      for (const att of atts) {
        const ga = att.graphAttachment;
        if (!ga.contentBytes) continue;

        const storagePath = `${firmId}/${emailRow.id}/${ga.id}_${att.name}`;
        const fileBytes = base64ToUint8Array(ga.contentBytes);

        const { error: uploadError } = await supabaseAdmin.storage
          .from("email-attachments")
          .upload(storagePath, fileBytes, {
            contentType: ga.contentType,
            upsert: true,
          });

        if (uploadError) continue;

        await supabaseAdmin.from("email_attachments").insert({
          email_id: emailRow.id,
          firm_id: firmId,
          microsoft_attachment_id: ga.id,
          name: att.name,
          content_type: ga.contentType,
          size_bytes: ga.size,
          storage_path: storagePath,
        });

        attachmentsSaved++;
      }
    }

    await supabaseAdmin
      .from("outlook_oauth_tokens")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    return new Response(
      JSON.stringify({
        synced: emailRows.length,
        attachments: attachmentsSaved,
        initial: isInitialSync,
        message: isInitialSync
          ? `Initial sync complete. Imported ${emailRows.length} emails from the last 30 days.`
          : `Synced ${emailRows.length} new emails.`,
      }),
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
