import type { FtpNode } from "../../types/ftp"
import { FTP_AT_ROOT_ID, atNodeId } from "../ftp-sources"
import { resolveSupabaseClient, type SupabaseResult } from "./result"

export interface AtFtpElement {
  nombre: string
  ruta: string
  esCarpeta: boolean
  bytes: number
  creado: string | null
  modificado: string | null
}

export interface AtFtpListPayload {
  ruta: string
  elementos: AtFtpElement[]
}

function envUrl() {
  return String(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "")
}

function envAnonKey() {
  return String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "")
}

async function authorizedAtFtpFetch(query: string): Promise<Response | SupabaseResult<never>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data: sessionData } = await resolved.client.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) {
    return { ok: false, reason: "error", message: "Inicia sesión para consultar el archivo AT." }
  }

  return fetch(`${envUrl()}/functions/v1/at-ftp?${query}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: envAnonKey(),
    },
  })
}

export function mapAtElementToFtpNode(element: AtFtpElement, parentId: string): FtpNode {
  return {
    id: atNodeId(element.ruta),
    parentId,
    name: element.nombre,
    nodeType: element.esCarpeta ? "folder" : "file",
    sizeBytes: Number(element.bytes) || 0,
    source: "at",
    atRuta: element.ruta,
    createdAt: element.creado ?? new Date().toISOString(),
    updatedAt: element.modificado ?? element.creado ?? new Date().toISOString(),
  }
}

export async function listAtFtpFolder(ruta = ""): Promise<SupabaseResult<FtpNode[]>> {
  const response = await authorizedAtFtpFetch(
    `action=list&ruta=${encodeURIComponent(ruta)}`
  )
  if (!(response instanceof Response)) return response

  const payload = (await response.json().catch(() => null)) as
    | AtFtpListPayload
    | { error?: string }
    | null

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String(payload.error ?? "No se pudo listar el FTP de AT.")
        : `HTTP ${response.status}`
    return { ok: false, reason: "error", message }
  }

  const elementos = payload && "elementos" in payload ? payload.elementos : []
  const parentId = ruta ? atNodeId(ruta) : FTP_AT_ROOT_ID
  return {
    ok: true,
    data: (elementos ?? []).map((item) => mapAtElementToFtpNode(item, parentId)),
  }
}

export async function fetchAtFtpBlob(ruta: string): Promise<SupabaseResult<Blob>> {
  const response = await authorizedAtFtpFetch(
    `action=file&ruta=${encodeURIComponent(ruta)}`
  )
  if (!(response instanceof Response)) return response

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    return {
      ok: false,
      reason: "error",
      message: payload?.error ?? `No se pudo obtener el archivo (${response.status}).`,
    }
  }

  return { ok: true, data: await response.blob() }
}

export async function downloadAtFtpFile(ruta: string, fileName: string): Promise<SupabaseResult<void>> {
  const result = await fetchAtFtpBlob(ruta)
  if (!result.ok) return result
  triggerBlobDownload(result.data, fileName)
  return { ok: true, data: undefined }
}

export function triggerBlobDownload(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = objectUrl
  link.download = fileName || "archivo"
  link.rel = "noopener"
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}
