import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

export async function assertErpOpsAdmin(req: Request): Promise<{ ok: true } | Response> {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { error: "No autorizado" })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json(500, { error: "Supabase env incompleto en la función" })
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) {
    return json(401, { error: "Sesión inválida" })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle()

  const role =
    profile?.role ??
    (userData.user.app_metadata?.role as string | undefined) ??
    (userData.user.user_metadata?.role as string | undefined)

  if (role !== "superadmin" && role !== "tramitacion") {
    return json(403, { error: "Solo superadmin o tramitación pueden enviar invitaciones" })
  }

  return { ok: true }
}

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  return null
}

export { corsHeaders, json }
