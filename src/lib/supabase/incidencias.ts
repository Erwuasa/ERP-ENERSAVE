import {
  generateIncidenciaCodigoFromId,
  migrateLegacyEstado,
  type IncidenciaOrigen,
  type IncidenciaPrioridad,
  type IncidenciaTicket,
  type IncidenciaTipo,
} from "../incidencias"
import {
  mapPatchToRow,
  resolveSupabaseClient,
  str,
  toSupabaseFailure,
  type Row,
  type SupabaseResult,
} from "./result"

const TABLE = "incidencias"

const TIPOS: IncidenciaTipo[] = [
  "Tarifa Incorrecta",
  "Retraso de Firma",
  "Error de CUPS",
  "Reclamación Distribuidora",
  "Incidencia Cartera",
  "Riesgo de Seguridad",
]

const PRIORIDADES: IncidenciaPrioridad[] = ["critica", "alta", "media", "baja"]

const ORIGENES: IncidenciaOrigen[] = ["manual", "comercial", "sistema", "cliente"]

function toFailure(error: { code?: string; message: string }) {
  return toSupabaseFailure(error, TABLE)
}

export function mapRowToIncidencia(row: Row): IncidenciaTicket {
  const id = String(row.id ?? "")
  // `titulo` es el respaldo de `tipo` en filas creadas antes de la migración
  // que añadió la columna dedicada.
  const tipo = (str(row.tipo) ?? str(row.titulo)) as IncidenciaTipo | undefined
  const prioridad = str(row.prioridad) as IncidenciaPrioridad | undefined
  const origen = str(row.origen) as IncidenciaOrigen | undefined

  return {
    id,
    codigo: str(row.codigo) ?? generateIncidenciaCodigoFromId(id),
    clientName: str(row.cliente_nombre) ?? "",
    tipo: tipo && TIPOS.includes(tipo) ? tipo : "Incidencia Cartera",
    prioridad: prioridad && PRIORIDADES.includes(prioridad) ? prioridad : undefined,
    estado: migrateLegacyEstado(str(row.estado) ?? ""),
    origen: origen && ORIGENES.includes(origen) ? origen : "manual",
    comercialId: str(row.creado_por) ?? "",
    comercialName: str(row.comercial_nombre) ?? "",
    descripcion: str(row.descripcion) ?? "",
    asignadoA: str(row.asignado_a),
    canal: str(row.canal),
    createdAt: str(row.created_at),
    estadoAt: str(row.estado_at),
  }
}

const PATCH_COLUMNS: Partial<Record<keyof IncidenciaTicket, string>> = {
  clientName: "cliente_nombre",
  tipo: "tipo",
  prioridad: "prioridad",
  estado: "estado",
  origen: "origen",
  comercialId: "creado_por",
  comercialName: "comercial_nombre",
  descripcion: "descripcion",
  asignadoA: "asignado_a",
  canal: "canal",
  estadoAt: "estado_at",
}

export function buildIncidenciaPatch(patch: Partial<IncidenciaTicket>): Row {
  const row = mapPatchToRow(patch, PATCH_COLUMNS)
  // `titulo` es NOT NULL en la tabla y la app no tiene un campo equivalente:
  // se mantiene sincronizado con el tipo, que es lo que muestra el Kanban.
  if (patch.tipo !== undefined) row.titulo = patch.tipo
  // Volver a un estado abierto limpia estadoAt poniéndolo a undefined, y eso
  // mapPatchToRow lo omite; hay que escribir null explícitamente.
  if ("estadoAt" in patch && patch.estadoAt === undefined) row.estado_at = null
  return row
}

export async function listIncidencias(): Promise<SupabaseResult<IncidenciaTicket[]>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return toFailure(error)

  return { ok: true, data: (data ?? []).map((row) => mapRowToIncidencia(row as Row)) }
}

/**
 * El código lo genera un trigger en Postgres a partir de una secuencia, así
 * que no se envía: evita colisiones con el `INC-xxxx` calculado en local.
 */
export async function createIncidencia(
  incidencia: IncidenciaTicket
): Promise<SupabaseResult<IncidenciaTicket>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client
    .from(TABLE)
    .insert(buildIncidenciaPatch(incidencia))
    .select("*")
    .single()

  if (error) return toFailure(error)

  return { ok: true, data: mapRowToIncidencia(data as Row) }
}

export async function updateIncidencia(
  id: string,
  patch: Partial<IncidenciaTicket>
): Promise<SupabaseResult<IncidenciaTicket>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const row = buildIncidenciaPatch(patch)
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

  return { ok: true, data: mapRowToIncidencia(data as Row) }
}

export async function deleteIncidencia(id: string): Promise<SupabaseResult<void>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { error } = await resolved.client.from(TABLE).delete().eq("id", id)
  if (error) return toFailure(error)

  return { ok: true, data: undefined }
}
