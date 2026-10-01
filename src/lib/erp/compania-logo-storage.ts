import { getSupabaseClient } from "../supabase/client"
import type { CompaniaLogoKey } from "./compania-logos"
import { COMPANIA_LOGO_KEYS } from "./compania-logos"

export const COMPANIA_LOGO_BUCKET = "Website"

/**
 * Rutas en Supabase Storage (bucket Website / Material).
 * URL pública estable: no expira (sin createSignedUrl).
 */
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
  acciona: "Material/logo acciona.webp",
  alumbraenergia: "Material/logo-alumbraenergia.webp",
  chcenergia: "Material/logo chc energia.jpg",
  cyenergia: "Material/logo cye energia.webp",
  energyavm: "Material/logo Energya VM.webp",
  imaginaenergia: "Material/logo imagina energia.webp",
  inerenergia: "Material/logo iner energia.webp",
  logos: "Material/logo logos energia.webp",
  maxenergia: "Material/logo max energia.webp",
  nexus: "Material/logo nexus energia.webp",
  nordy: "Material/logo nordy.webp",
  opcionenergia: "Material/logo opcion Energia.jpg",
  plenitude: "Material/logo plenitude.webp",
  podo: "Material/logo podo.webp",
  reazziona: "Material/logo reazziona.webp",
  yaluz: "Material/logo yaluz.webp",
  neon: "Material/logo neon energia.webp",
}

function supabaseProjectUrl(): string {
  return String(
    import.meta.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL ?? ""
  ).replace(/\/$/, "")
}

/** Codifica cada segmento del path (espacios, tildes). */
export function encodeStorageObjectPath(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/")
}

/** URL pública permanente del objeto en Storage (requiere bucket/objeto legible como public). */
export function buildCompaniaLogoPublicStorageUrl(
  key: CompaniaLogoKey,
  bucket: string = COMPANIA_LOGO_BUCKET
): string | null {
  const objectPath = COMPANIA_BUCKET_LOGO_PATHS[key]
  if (!objectPath) return null

  const base = supabaseProjectUrl()
  if (!base) return null

  return `${base}/storage/v1/object/public/${bucket}/${encodeStorageObjectPath(objectPath)}`
}

const resolvedUrlCache = new Map<CompaniaLogoKey, string>()
const blobUrlCache = new Map<CompaniaLogoKey, string>()
const inflightBlob = new Map<CompaniaLogoKey, Promise<string | null>>()

async function fetchBlobUrlFallback(key: CompaniaLogoKey): Promise<string | null> {
  const cached = blobUrlCache.get(key)
  if (cached) return cached

  let pending = inflightBlob.get(key)
  if (!pending) {
    pending = (async () => {
      const client = getSupabaseClient()
      const objectPath = COMPANIA_BUCKET_LOGO_PATHS[key]
      if (!client || !objectPath) return null

      const { data, error } = await client.storage.from(COMPANIA_LOGO_BUCKET).download(objectPath)
      if (error || !data) return null

      const blobUrl = URL.createObjectURL(data)
      blobUrlCache.set(key, blobUrl)
      return blobUrl
    })().finally(() => {
      inflightBlob.delete(key)
    })
    inflightBlob.set(key, pending)
  }

  return pending
}

/**
 * Devuelve al instante la URL pública (optimista). Si falla en runtime, se puede usar blob fallback.
 */
export function getCompaniaLogoUrlSync(key: CompaniaLogoKey): string | null {
  const cached = resolvedUrlCache.get(key)
  if (cached) return cached

  const publicUrl = buildCompaniaLogoPublicStorageUrl(key)
  if (publicUrl) resolvedUrlCache.set(key, publicUrl)
  return publicUrl
}

/** Compat: resuelve de forma síncrona; el fallback blob es async por si el bucket aún es privado. */
export function getCompaniaLogoBucketUrl(key: CompaniaLogoKey): Promise<string | null> {
  const sync = getCompaniaLogoUrlSync(key)
  if (sync) return Promise.resolve(sync)
  return fetchBlobUrlFallback(key)
}

/** Si la URL pública falla (404), descarga con sesión y cachea blob en memoria. */
export async function resolveCompaniaLogoUrlAfterPublicFailure(
  key: CompaniaLogoKey
): Promise<string | null> {
  return fetchBlobUrlFallback(key)
}

export function preloadCompaniaLogoBucketUrls(): void {
  for (const key of COMPANIA_LOGO_KEYS) {
    const url = getCompaniaLogoUrlSync(key)
    if (!url) continue
    const img = new Image()
    img.decoding = "async"
    img.src = url
  }
}
