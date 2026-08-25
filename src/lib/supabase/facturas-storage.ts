import type { SupabaseClient } from "@supabase/supabase-js"

export const FACTURAS_STORAGE_BUCKET = "facturas"

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

export async function signFacturaPaths(
  client: SupabaseClient,
  paths: string[],
  expiresIn = 3600
): Promise<string[]> {
  const unique = [...new Set(paths.filter((p) => p.trim().length > 0))]
  if (unique.length === 0) return []

  const signed: string[] = []
  for (const path of unique) {
    if (isHttpUrl(path)) {
      signed.push(path)
      continue
    }
    const { data, error } = await client.storage
      .from(FACTURAS_STORAGE_BUCKET)
      .createSignedUrl(path, expiresIn)
    if (error || !data?.signedUrl) continue
    signed.push(data.signedUrl)
  }
  return signed
}
