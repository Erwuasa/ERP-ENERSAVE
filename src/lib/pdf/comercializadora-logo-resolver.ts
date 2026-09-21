import { COMPANIA_LOGO_SRC } from "../erp/compania-logo-assets"
import { getCompaniaLogoBucketUrl } from "../erp/compania-logo-storage"
import { resolveCompaniaLogoKey } from "../erp/compania-logos"
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

  let src: string | null = await getCompaniaLogoBucketUrl(key)
  if (!src) {
    src = COMPANIA_LOGO_SRC[key] ?? null
  }
  if (!src) return null

  return getCachedTrimmed(src)
}
