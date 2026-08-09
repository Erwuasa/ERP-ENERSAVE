import type { Client, ClienteArchivo, ClienteEstado } from "../../types/client"
import {
  bool,
  isoDate,
  mapPatchToRow,
  resolveSupabaseClient,
  str,
  toSupabaseFailure,
  type Row,
  type SupabaseResult,
} from "./result"

const TABLE = "clientes"

const ESTADOS: ClienteEstado[] = ["activo", "pendiente", "inactivo"]

function toFailure(error: { code?: string; message: string }) {
  return toSupabaseFailure(error, TABLE)
}

function archivosOf(value: unknown): ClienteArchivo[] {
  return Array.isArray(value) ? (value as ClienteArchivo[]) : []
}

export function mapRowToClient(row: Row): Client {
  const estado = str(row.estado) as ClienteEstado | undefined

  return {
    id: String(row.id ?? ""),
    nombre: str(row.nombre) ?? "",
    estado: estado && ESTADOS.includes(estado) ? estado : "pendiente",
    documento: str(row.nif_cif),
    telefono: str(row.telefono),
    email: str(row.email),
    direccion: str(row.direccion),
    codigoPostal: str(row.codigo_postal),
    ciudad: str(row.localidad),
    provincia: str(row.provincia),
    esMoroso: bool(row.es_moroso),
    tipoCliente: row.tipo_cliente === "empresa" ? "empresa" : "particular",
    comercialId: str(row.comercial_id) ?? "",
    archivos: archivosOf(row.archivos),
    createdAt: isoDate(row.created_at) ?? "",
  }
}

const PATCH_COLUMNS: Partial<Record<keyof Client, string>> = {
  nombre: "nombre",
  estado: "estado",
  documento: "nif_cif",
  telefono: "telefono",
  email: "email",
  direccion: "direccion",
  codigoPostal: "codigo_postal",
  ciudad: "localidad",
  provincia: "provincia",
  esMoroso: "es_moroso",
  tipoCliente: "tipo_cliente",
  comercialId: "comercial_id",
  archivos: "archivos",
}

export function buildClientPatch(patch: Partial<Client>): Row {
  return mapPatchToRow(patch, PATCH_COLUMNS)
}

export async function listClientes(): Promise<SupabaseResult<Client[]>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return toFailure(error)

  return { ok: true, data: (data ?? []).map((row) => mapRowToClient(row as Row)) }
}

/**
 * El id local (`cli-<timestamp>`) no es un uuid válido, así que se descarta y
 * se deja que Postgres genere el definitivo. El llamante debe reconciliar el
 * id devuelto con el registro que tenga en estado local.
 */
export async function createCliente(client: Client): Promise<SupabaseResult<Client>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const row: Row = { ...buildClientPatch(client), archivos: client.archivos ?? [] }

  const { data, error } = await resolved.client.from(TABLE).insert(row).select("*").single()
  if (error) return toFailure(error)

  return { ok: true, data: mapRowToClient(data as Row) }
}

export async function updateCliente(
  id: string,
  patch: Partial<Client>
): Promise<SupabaseResult<Client>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const row = buildClientPatch(patch)
  if (Object.keys(row).length === 0) {
    return { ok: false, reason: "error", message: "No hay cambios que persistir." }
  }

  const { data, error } = await resolved.client
    .from(TABLE)
    .update(row)
    .eq("id", id)
    .select("*")
    .single()

  if (error) return toFailure(error)

  return { ok: true, data: mapRowToClient(data as Row) }
}

export async function deleteCliente(id: string): Promise<SupabaseResult<void>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { error } = await resolved.client.from(TABLE).delete().eq("id", id)
  if (error) return toFailure(error)

  return { ok: true, data: undefined }
}
