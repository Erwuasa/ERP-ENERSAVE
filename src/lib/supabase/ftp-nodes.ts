import type { FtpNode } from "../../types/ftp"
import { buildSeedFtpNodes } from "../../data/ftp-seed-catalog"
import {
  isoDate,
  num,
  resolveSupabaseClient,
  str,
  toSupabaseFailure,
  type Row,
  type SupabaseResult,
} from "./result"

const TABLE = "ftp_nodes"
const STORAGE_BUCKET = "ftp-documentos"
const LOCAL_STORAGE_KEY = "enersave-ftp-nodes-v1"

function toFailure(error: { code?: string; message: string }) {
  return toSupabaseFailure(error, TABLE)
}

export function mapRowToFtpNode(row: Row): FtpNode {
  const nodeType = str(row.node_type)
  return {
    id: String(row.id ?? ""),
    parentId: row.parent_id ? String(row.parent_id) : null,
    name: str(row.name) ?? "",
    nodeType: nodeType === "file" ? "file" : "folder",
    storagePath: str(row.storage_path) ?? null,
    mimeType: str(row.mime_type) ?? null,
    sizeBytes: num(row.size_bytes) ?? null,
    createdBy: str(row.created_by) ?? null,
    createdAt: isoDate(row.created_at) ?? new Date().toISOString(),
    updatedAt: isoDate(row.updated_at) ?? new Date().toISOString(),
  }
}

function readLocalNodes(): FtpNode[] | null {
  if (typeof localStorage === "undefined") return null
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as FtpNode[]
  } catch {
    return null
  }
}

function writeLocalNodes(nodes: FtpNode[]) {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nodes))
}

export function getFallbackFtpNodes(): FtpNode[] {
  return readLocalNodes() ?? buildSeedFtpNodes()
}

export async function listFtpNodes(): Promise<SupabaseResult<FtpNode[]>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) {
    return { ok: true, data: getFallbackFtpNodes() }
  }

  const { data, error } = await resolved.client
    .from(TABLE)
    .select("*")
    .order("name", { ascending: true })

  if (error) {
    if (toSupabaseFailure(error, TABLE).reason === "table_missing") {
      return { ok: true, data: getFallbackFtpNodes() }
    }
    return toFailure(error)
  }

  const rows = (data ?? []).map((row) => mapRowToFtpNode(row as Row))
  if (rows.length === 0) return { ok: true, data: buildSeedFtpNodes() }
  return { ok: true, data: rows }
}

export async function createFtpFolder(input: {
  parentId: string | null
  name: string
  createdBy?: string | null
}): Promise<SupabaseResult<FtpNode>> {
  const trimmed = input.name.trim()
  if (!trimmed) {
    return { ok: false, reason: "error", message: "El nombre de la carpeta es obligatorio." }
  }

  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) {
    const nodes = getFallbackFtpNodes()
    const created: FtpNode = {
      id: `ftp-local-${Date.now()}`,
      parentId: input.parentId,
      name: trimmed,
      nodeType: "folder",
      createdBy: input.createdBy ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    writeLocalNodes([...nodes, created])
    return { ok: true, data: created }
  }

  const { data, error } = await resolved.client
    .from(TABLE)
    .insert({
      parent_id: input.parentId,
      name: trimmed,
      node_type: "folder",
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single()

  if (error) return toFailure(error)
  return { ok: true, data: mapRowToFtpNode(data as Row) }
}

export async function uploadFtpFile(input: {
  parentId: string
  file: File
  createdBy?: string | null
}): Promise<SupabaseResult<FtpNode>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) {
    const nodes = getFallbackFtpNodes()
    const created: FtpNode = {
      id: `ftp-file-${Date.now()}`,
      parentId: input.parentId,
      name: input.file.name,
      nodeType: "file",
      mimeType: input.file.type || null,
      sizeBytes: input.file.size,
      storagePath: null,
      createdBy: input.createdBy ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    writeLocalNodes([...nodes, created])
    return { ok: true, data: created }
  }

  const safeName = input.file.name.replace(/[^\w.\-() ]+/g, "_")
  const storagePath = `${input.parentId}/${Date.now()}-${safeName}`

  const upload = await resolved.client.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, input.file, { upsert: false })

  if (upload.error) {
    return {
      ok: false,
      reason: "error",
      message: upload.error.message || "No se pudo subir el archivo.",
    }
  }

  const { data, error } = await resolved.client
    .from(TABLE)
    .insert({
      parent_id: input.parentId,
      name: input.file.name,
      node_type: "file",
      storage_path: storagePath,
      mime_type: input.file.type || null,
      size_bytes: input.file.size,
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single()

  if (error) return toFailure(error)
  return { ok: true, data: mapRowToFtpNode(data as Row) }
}

export async function deleteFtpNode(
  node: FtpNode,
  allNodes: FtpNode[]
): Promise<SupabaseResult<void>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) {
    const idsToRemove = new Set<string>([node.id])
    if (node.nodeType === "folder") {
      let changed = true
      const next = [...allNodes]
      while (changed) {
        changed = false
        for (const n of next) {
          if (n.parentId && idsToRemove.has(n.parentId) && !idsToRemove.has(n.id)) {
            idsToRemove.add(n.id)
            changed = true
          }
        }
      }
    }
    writeLocalNodes(allNodes.filter((n) => !idsToRemove.has(n.id)))
    return { ok: true, data: undefined }
  }

  if (node.nodeType === "file" && node.storagePath) {
    await resolved.client.storage.from(STORAGE_BUCKET).remove([node.storagePath])
  }

  const { error } = await resolved.client.from(TABLE).delete().eq("id", node.id)
  if (error) return toFailure(error)
  return { ok: true, data: undefined }
}

export async function getFtpFileDownloadUrl(
  node: FtpNode
): Promise<SupabaseResult<string>> {
  if (!node.storagePath) {
    return {
      ok: false,
      reason: "error",
      message: "Archivo no disponible para descarga en modo local.",
    }
  }

  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Supabase no configurado.",
    }
  }

  const { data, error } = await resolved.client.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(node.storagePath, 3600)

  if (error || !data?.signedUrl) {
    return {
      ok: false,
      reason: "error",
      message: error?.message ?? "No se pudo generar el enlace de descarga.",
    }
  }

  return { ok: true, data: data.signedUrl }
}

export const FTP_STORAGE_BUCKET = STORAGE_BUCKET
