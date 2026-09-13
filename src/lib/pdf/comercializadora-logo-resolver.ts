import { COMPANIA_LOGO_SRC } from "../erp/compania-logo-assets"
import { resolveCompaniaLogoKey } from "../erp/compania-logos"
import { getSupabaseClient } from "../supabase/client"
import { trimImageWhitespace } from "./image-trim"

/**
 * Resolución del logo real de una comercializadora para el Estudio de Ahorro en PDF.
 * Nunca se genera un logo (iniciales, avatar de color, placeholder, etc.): si no hay
 * imagen real disponible, se devuelve `null` y el llamador simplemente no la pinta.
 *
 * Orden de resolución:
 *  1. Bucket "Website" de Supabase (carpeta Material/), la fuente original de las marcas.
 *  2. Copia local ya empaquetada en el ERP (mismo fichero, cacheado como fallback si el
 *     bucket no está accesible desde el cliente o la petición falla).
 */

const BUCKET = "Website"
const SIGNED_URL_TTL_SECONDS = 60 * 60

/** Ruta real (comprobada) de cada logo dentro de Website/Material en Supabase Storage. */
const BUCKET_LOGO_PATHS: Record<string, string> = {
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
    const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
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

const trimmedCache = new Map<string, Promise<string>>()

function getCachedTrimmed(src: string): Promise<string> {
  let pending = trimmedCache.get(src)
  if (!pending) {
    pending = trimImageWhitespace(src)
    trimmedCache.set(src, pending)
  }
  return pending
}

/**
 * Devuelve la URL de imagen real de la comercializadora, ya recortada a su contenido
 * (sin el aire/margen del fichero original, para que se vea grande y legible al
 * tamaño fijo de la cabecera), o `null` si no existe ninguna imagen.
 */
export async function resolveComercializadoraLogoSrc(comercializadora: string): Promise<string | null> {
  const key = resolveCompaniaLogoKey(comercializadora)
  if (!key) return null

  const bucketPath = BUCKET_LOGO_PATHS[key]
  let src: string | null = null
  if (bucketPath) {
    src = await getCachedSignedUrl(bucketPath)
  }
  if (!src) {
    src = COMPANIA_LOGO_SRC[key] ?? null
  }
  if (!src) return null

  return getCachedTrimmed(src)
}
