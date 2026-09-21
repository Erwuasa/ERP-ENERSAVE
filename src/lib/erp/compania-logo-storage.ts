import { getSupabaseClient } from "../supabase/client"
import type { CompaniaLogoKey } from "./compania-logos"
import { COMPANIA_LOGO_KEYS } from "./compania-logos"

export const COMPANIA_LOGO_BUCKET = "Website"
const SIGNED_URL_TTL_SECONDS = 60 * 60

/** Rutas verificadas dentro de Website/Material en Supabase Storage. */
export const COMPANIA_BUCKET_LOGO_PATHS: Record<CompaniaLogoKey, string> = {
  endesa: "Material/Endesa Logo.webp",
  repsol: "Material/Repsol Logo.webp",
  naturgy: "Material/Naturgy Logo.webp",
  totalenergies: "Material/TotalEnergies Logo.webp",
  iberdrola: "Material/Iberdrola Logo.webp",
  niba: "Material/niba logo.png",
  axpo: "Material/axpo logo.png",
  ignis: "Material/ignis logo.png",
  ganaenergia: "Material/gana logo.png",
  unielectrica: "Material/UniElectrica logo.png",
  edp: "Material/edp logo.webp",
  holaluz: "Material/Holaluz logo.webp",
  octopus: "Material/Octopus Logo.webp",
}

const signedUrlCache = new Map<string, Promise<string | null>>()

async function fetchSignedUrl(path: string): Promise<string | null> {
  const client = getSupabaseClient()
  if (!client) return null
  try {
    const { data, error } = await client.storage
      .from(COMPANIA_LOGO_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    if (error || !data?.signedUrl) return null
    return data.signedUrl
  } catch {
    return null
  }
}

function getCachedSignedUrl(path: string): Promise<string | null> {
  let pending = signedUrlCache.get(path)
  if (!pending) {
    pending = fetchSignedUrl(path)
    signedUrlCache.set(path, pending)
  }
  return pending
}

export function getCompaniaLogoBucketUrl(key: CompaniaLogoKey): Promise<string | null> {
  const path = COMPANIA_BUCKET_LOGO_PATHS[key]
  if (!path) return Promise.resolve(null)
  return getCachedSignedUrl(path)
}

export function preloadCompaniaLogoBucketUrls(): void {
  for (const key of COMPANIA_LOGO_KEYS) {
    void getCompaniaLogoBucketUrl(key)
  }
}
