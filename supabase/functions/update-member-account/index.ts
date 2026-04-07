import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { user_id, full_name, username, email, password, system_role } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingProfile } = await supabaseAdmin
      .from("user_profiles")
      .select("id, username, email")
      .eq("id", user_id)
      .maybeSingle();

    if (!existingProfile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (username && username !== existingProfile.username) {
      const { data: taken } = await supabaseAdmin
        .from("user_profiles")
        .select("id")
        .eq("username", username)
        .neq("id", user_id)
        .maybeSingle();

      if (taken) {
        return new Response(
          JSON.stringify({ error: "Username is already taken." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const authUpdates: Record<string, unknown> = {};
    if (email && email !== existingProfile.email) authUpdates.email = email;
    if (password) authUpdates.password = password;

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user_id, authUpdates);
      if (authError) {
        return new Response(
          JSON.stringify({ error: authError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const profileUpdates: Record<string, unknown> = {};
    if (full_name !== undefined) profileUpdates.full_name = full_name;
    if (username) profileUpdates.username = username;
    if (email) profileUpdates.email = email;
    if (system_role) profileUpdates.system_role = system_role;

    if (full_name !== undefined) {
      const initials = (full_name || username || "")
        .split(" ")
        .filter(Boolean)
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "??";
      profileUpdates.avatar_initials = initials;
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from("user_profiles")
        .update(profileUpdates)
        .eq("id", user_id);

      if (profileError) {
        return new Response(
          JSON.stringify({ error: profileError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
