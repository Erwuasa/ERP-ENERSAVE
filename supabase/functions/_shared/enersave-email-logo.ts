import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

/** Logo corporativo (mismo que bucket Website / login). */
export const ENERSAVE_EMAIL_LOGO_BUCKET = "Website"
export const ENERSAVE_EMAIL_LOGO_PATH = "Logo/new logo.png"

/** 7 días — suficiente para que el cliente de correo cargue la imagen. */
const LOGO_SIGNED_TTL_SEC = 60 * 60 * 24 * 7

export async function resolveEnersaveEmailLogoUrl(): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) return null

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data, error } = await admin.storage
    .from(ENERSAVE_EMAIL_LOGO_BUCKET)
    .createSignedUrl(ENERSAVE_EMAIL_LOGO_PATH, LOGO_SIGNED_TTL_SEC)

  if (error || !data?.signedUrl) {
    console.warn("[enersave-email-logo] signed URL failed:", error?.message)
    return null
  }

  return data.signedUrl
}

/** Escapa & en query string para atributos HTML. */
export function escapeEmailImgSrc(url: string): string {
  return url.replace(/&/g, "&amp;")
}
