import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const userId = body.record?.user_id || body.user_id
    const action = body.action ?? "delete"
    const authHeader = req.headers.get("Authorization")

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (!userId || (action !== "delete" && action !== "update")) {
      return new Response(
        JSON.stringify({ error: "Invalid account management request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""

    const authenticatedClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: actor }, error: actorError } = await authenticatedClient.auth.getUser()

    if (actorError || !actor) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    )

    // The dashboard grants account-management access only to approved accounts.
    const { data: actorRecord, error: actorRecordError } = await supabaseAdmin
      .from("pending_users")
      .select("status")
      .eq("user_id", actor.id)
      .maybeSingle()

    if (actorRecordError || actorRecord?.status !== "approved") {
      return new Response(
        JSON.stringify({ error: "You are not allowed to manage accounts" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (action === "delete") {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

      if (error) {
        console.error("Delete auth user error:", error.message)
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const { error: deleteProfileError } = await supabaseAdmin
        .from("pending_users")
        .delete()
        .eq("user_id", userId)

      if (deleteProfileError) {
        console.error("Delete account record error:", deleteProfileError.message)
        return new Response(
          JSON.stringify({ error: "Auth account was deleted, but its dashboard record could not be removed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const password = typeof body.password === "string" ? body.password : ""

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, { password })

    if (updateAuthError) {
      console.error("Update auth user error:", updateAuthError.message)
      return new Response(
        JSON.stringify({ error: updateAuthError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("Error:", err)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
