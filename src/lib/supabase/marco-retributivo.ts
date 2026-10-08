import type { MarcoRetributivoEntry } from "../../data/marco-retributivo-catalog"
import { inferMarcoSegmentoFromText } from "../infer-erp-segment"
import { parseMarcoTramosJson, type MarcoConsumoTramo } from "../marco-consumo-tramo"
import { computeComisionBreakdown } from "../marco-commission"
import { isMarcoGenericPlaceholderTariff } from "../marco-dedup"
import { getSupabaseClient, isSupabaseConfigured } from "./client"

export type MarcoComisionUnidad =
  | "eur_cups"
  | "eur_mwh"
  | "porcentaje_facturado"
  | "porcentaje_consumo"
  | "porcentaje_termino"

export type MarcoSegmento = "residencial" | "pyme" | "autonomo" | "comunidades"

export const MARCO_SEGMENTO_OPTIONS: { value: MarcoSegmento; label: string }[] = [
  { value: "residencial", label: "Residencial" },
  { value: "pyme", label: "Pyme" },
  { value: "autonomo", label: "Autónomo" },
  { value: "comunidades", label: "Comunidades" },
]

export function normalizeSegmento(raw: string): MarcoSegmento {
  if (raw === "pyme" || raw === "autonomo" || raw === "comunidades" || raw === "residencial") {
    return raw
  }
  return "residencial"
}

export function inferSegmentoFromText(text: string): MarcoSegmento {
  return inferMarcoSegmentoFromText(text) ?? "residencial"
}

export function formatMarcoSegmentoLabel(segmento: MarcoSegmento): string {
  return MARCO_SEGMENTO_OPTIONS.find((o) => o.value === segmento)?.label ?? segmento
}

export interface MarcoRetributivoRow {
  id: string
  compania: string
  tarifa: string
  tipo: "luz" | "gas"
  peaje: string
  segmento: MarcoSegmento
  condicion_1: string | null
  condicion_2: string | null
  condiciones: string | null
  comision_tipo: "fija" | "porcentaje"
  comision_base: number
  comision_unidad: MarcoComisionUnidad
  vigencia_meses: number
  fecha_inicio: string
  activo: boolean
  created_at: string
  updated_at: string
  updated_by: string | null
  energia_p1: number | null
  energia_p2: number | null
  energia_p3: number | null
  energia_p4: number | null
  energia_p5: number | null
  energia_p6: number | null
  potencia_p1: number | null
  potencia_p2: number | null
  potencia_p3: number | null
  potencia_p4: number | null
  potencia_p5: number | null
  potencia_p6: number | null
  tipo_precio?: "fijo" | "indexado" | string | null
  incluye_sva?: boolean | null
  potencia_boe?: boolean | null
  tariff_id?: string | null
  at_rate_id?: string | null
  at_marco_id?: string | null
  collaborator_min?: number | null
  collaborator_max?: number | null
  at_kwh_min?: number | null
  at_kwh_max?: number | null
  tramos?: unknown
  source?: "manual" | "at" | null
}

export type MarcoRetributivoResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string }

export interface MarcoEntryInput {
  compania: string
  tarifa: string
  tipo: "luz" | "gas"
  peaje: string
  segmento: MarcoSegmento
  condicion_1?: string | null
  condicion_2?: string | null
  condiciones?: string | null
  comision_tipo: "fija" | "porcentaje"
  comision_base: number
  comision_unidad: MarcoComisionUnidad
  vigencia_meses: number
  fecha_inicio: string
  activo?: boolean
}

export type NewMarcoEntryInput = MarcoEntryInput

const MARCO_SELECT =
  "id, compania, tarifa, tipo, peaje, segmento, condicion_1, condicion_2, condiciones, comision_tipo, comision_base, comision_unidad, vigencia_meses, fecha_inicio, activo, created_at, updated_at, updated_by, energia_p1, energia_p2, energia_p3, energia_p4, energia_p5, energia_p6, potencia_p1, potencia_p2, potencia_p3, potencia_p4, potencia_p5, potencia_p6, tipo_precio, incluye_sva, potencia_boe, tariff_id, at_rate_id, at_marco_id, collaborator_min, collaborator_max, at_kwh_min, at_kwh_max, tramos, source"

/** PostgREST devuelve como máximo 1000 filas por petición; paginamos para traer todo el catálogo. */
export const MARCO_LIST_PAGE_SIZE = 500

/** Tras filtrar placeholders el batch puede ser < pageSize aunque haya más páginas en BD. */
export function marcoListShouldFetchNextPage(
  fetchedRowCount: number,
  pageSize: number = MARCO_LIST_PAGE_SIZE
): boolean {
  return fetchedRowCount >= pageSize
}

function mapError(error: { message: string }): MarcoRetributivoResult<never> {
  return { ok: false, message: error.message }
}

type MarcoClientError = { ok: false; message: string }

function isMarcoClientError(
  value: NonNullable<ReturnType<typeof getSupabaseClient>> | MarcoClientError
): value is MarcoClientError {
  return typeof value === "object" && value !== null && "ok" in value && value.ok === false
}

function requireClient():
  | NonNullable<ReturnType<typeof getSupabaseClient>>
  | MarcoClientError {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase no configurado" }
  }
  const client = getSupabaseClient()
  if (!client) return { ok: false, message: "Cliente Supabase no disponible" }
  return client
}

function mapRow(row: MarcoRetributivoRow): MarcoRetributivoRow {
  const numeric = (v: unknown) => (v == null ? null : Number(v))
  return {
    ...row,
    segmento: normalizeSegmento(row.segmento),
    comision_base: Number(row.comision_base),
    energia_p1: numeric(row.energia_p1),
    energia_p2: numeric(row.energia_p2),
    energia_p3: numeric(row.energia_p3),
    energia_p4: numeric(row.energia_p4),
    energia_p5: numeric(row.energia_p5),
    energia_p6: numeric(row.energia_p6),
    potencia_p1: numeric(row.potencia_p1),
    potencia_p2: numeric(row.potencia_p2),
    potencia_p3: numeric(row.potencia_p3),
    potencia_p4: numeric(row.potencia_p4),
    potencia_p5: numeric(row.potencia_p5),
    potencia_p6: numeric(row.potencia_p6),
    incluye_sva: row.incluye_sva == null ? null : Boolean(row.incluye_sva),
    potencia_boe: row.potencia_boe == null ? null : Boolean(row.potencia_boe),
    at_kwh_min: numeric(row.at_kwh_min),
    at_kwh_max: numeric(row.at_kwh_max),
    tramos: row.tramos,
  }
}

function slugToUuid(slug: string): string {
  let h = 0
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0
  }
  const hex = h.toString(16).padStart(8, "0")
  const tail = slug.replace(/[^a-f0-9]/gi, "").padEnd(12, "0").slice(0, 12).toLowerCase()
  return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(4, 7)}-a${hex.slice(7, 10)}-${tail.padEnd(12, "0")}`
}

export function catalogSlugToUuid(slug: string): string {
  return slugToUuid(`marco:${slug}`)
}

export function catalogEntryToRow(entry: MarcoRetributivoEntry): MarcoRetributivoRow {
  const now = new Date().toISOString()
  return {
    id: catalogSlugToUuid(entry.id),
    compania: entry.compania,
    tarifa: entry.tarifa,
    tipo: entry.tipo,
    peaje: entry.peaje,
    segmento: inferSegmentoFromText(entry.condiciones),
    condicion_1: null,
    condicion_2: null,
    condiciones: entry.condiciones,
    comision_tipo: entry.comisionTipo,
    comision_base: entry.comisionBase,
    comision_unidad: entry.comisionUnidad,
    vigencia_meses: entry.vigenciaMeses,
    fecha_inicio: "2026-05-01",
    activo: true,
    created_at: now,
    updated_at: now,
    updated_by: null,
    energia_p1: null,
    energia_p2: null,
    energia_p3: null,
    energia_p4: null,
    energia_p5: null,
    energia_p6: null,
    potencia_p1: null,
    potencia_p2: null,
    potencia_p3: null,
    potencia_p4: null,
    potencia_p5: null,
    potencia_p6: null,
  }
}

export function marcoRowToCatalogEntry(row: MarcoRetributivoRow): MarcoRetributivoEntry {
  const tramos = parseMarcoTramosJson(row.tramos)
  return {
    id: row.id,
    compania: row.compania,
    tarifa: row.tarifa,
    tipo: row.tipo,
    peaje: row.peaje,
    segmento: row.segmento,
    condicion1: row.condicion_1 ?? undefined,
    condicion2: row.condicion_2 ?? undefined,
    condiciones:
      row.condiciones ??
      [row.condicion_1, row.condicion_2].filter(Boolean).join(" ") ??
      "",
    comisionTipo: row.comision_tipo,
    comisionBase: row.comision_base,
    comisionUnidad: row.comision_unidad,
    vigenciaMeses: row.vigencia_meses,
    atKwhMin: row.at_kwh_min,
    atKwhMax: row.at_kwh_max,
    tramos: tramos.length > 0 ? tramos : undefined,
  }
}

function toDbPatch(
  patch: Partial<MarcoEntryInput>,
  updatedBy?: string | null
): Record<string, unknown> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updatedBy !== undefined) row.updated_by = updatedBy
  if (patch.compania !== undefined) row.compania = patch.compania
  if (patch.tarifa !== undefined) row.tarifa = patch.tarifa
  if (patch.tipo !== undefined) row.tipo = patch.tipo
  if (patch.peaje !== undefined) row.peaje = patch.peaje
  if (patch.segmento !== undefined) row.segmento = patch.segmento
  if (patch.condicion_1 !== undefined) row.condicion_1 = patch.condicion_1
  if (patch.condicion_2 !== undefined) row.condicion_2 = patch.condicion_2
  if (patch.condiciones !== undefined) row.condiciones = patch.condiciones
  if (patch.comision_tipo !== undefined) row.comision_tipo = patch.comision_tipo
  if (patch.comision_base !== undefined) row.comision_base = patch.comision_base
  if (patch.comision_unidad !== undefined) row.comision_unidad = patch.comision_unidad
  if (
    patch.comision_base !== undefined ||
    patch.comision_tipo !== undefined ||
    patch.comision_unidad !== undefined ||
    patch.condiciones !== undefined ||
    patch.condicion_1 !== undefined ||
    patch.condicion_2 !== undefined ||
    patch.vigencia_meses !== undefined
  ) {
    row.source = "manual"
    row.at_marco_id = null
  }
  if (patch.vigencia_meses !== undefined) row.vigencia_meses = patch.vigencia_meses
  if (patch.fecha_inicio !== undefined) row.fecha_inicio = patch.fecha_inicio
  if (patch.activo !== undefined) row.activo = patch.activo
  return row
}

// `marco_retributivo` fue archivada (renombrada a marco_retributivo_legacy_archive) tras la
// consolidación en Enertech: ya no hay sustituto 1:1 (grano distinto a enertech_comisiones), así
// que todo este módulo degrada a "vacío"/"no encontrado" en vez de propagar el error de Postgres.
// Ver AGENTS.md §9.
function isMarcoTableMissingError(error: { message?: string; code?: string }): boolean {
  return (
    Boolean(error.message?.includes("does not exist")) ||
    Boolean(error.message?.includes("relation")) ||
    Boolean(error.message?.includes("schema cache")) ||
    error.code === "42P01" ||
    error.code === "PGRST205"
  )
}

// --- Lectura desde enertech_comisiones ------------------------------------------------------
//
// `marco_retributivo` está archivada. Las comisiones viven ahora en `enertech_comisiones`: una
// fila por tramo de consumo (`tramo`: "40000-50000 kWh") × campaña (`campania`, el nombre de
// producto, p.ej. "TERRA SOLID 24h ZEN 8") × tarifa de acceso (`tarifa`, p.ej. "2.0TD").
// `company_id` se rellenó por comparación con marco_retributivo_legacy_archive (coincidencia de
// nombre de producto → compañía); solo cubre ~53% de las filas — el resto son productos que
// nunca estuvieron en el marco manual, así que su compañía es desconocida (no es un bug).
// Aquí se agrupan esas filas en una entrada por (campaña, tarifa de acceso), con un tramo por
// fila agrupada, para mantener la forma MarcoRetributivoRow que ya consume el resto del ERP.

const ENERTECH_COMISIONES_PAGE_SIZE = 1000

interface EnertechComisionRow {
  clave: string
  company_id: number | null
  payload: Record<string, unknown> | null
  enertech_comercializadoras: { nombre: string | null } | { nombre: string | null }[] | null
}

const ENERTECH_COMISIONES_SELECT = `
  clave,
  company_id,
  payload,
  enertech_comercializadoras ( nombre )
`

function parseTramoRangeKwh(text: string): { desde: number; hasta: number } | null {
  const normalized = text.trim().toLowerCase()
  if (!normalized) return null

  const mwhRange = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:–|-|a)\s*(\d+(?:[.,]\d+)?)\s*mwh/)
  if (mwhRange) {
    const desde = Number(mwhRange[1]!.replace(",", "."))
    const hasta = Number(mwhRange[2]!.replace(",", "."))
    if (Number.isFinite(desde) && Number.isFinite(hasta)) {
      return { desde: desde * 1000, hasta: hasta * 1000 }
    }
  }

  const kwhRange = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:–|-|a)\s*(\d+(?:[.,]\d+)?)/)
  if (kwhRange) {
    const desde = Number(kwhRange[1]!.replace(",", "."))
    const hasta = Number(kwhRange[2]!.replace(",", "."))
    if (Number.isFinite(desde) && Number.isFinite(hasta)) return { desde, hasta }
  }

  const upper = normalized.match(/(?:hasta|≤|<)\s*(\d+(?:[.,]\d+)?)/)
  if (upper) {
    const hasta = Number(upper[1]!.replace(",", "."))
    if (Number.isFinite(hasta)) return { desde: 0, hasta }
  }

  return null
}

function tramoUnidadFromTipoComision(tipo: string): MarcoComisionUnidad {
  if (tipo === "fijo_mwh") return "eur_mwh"
  if (tipo === "fijo_kwh") return "eur_mwh" // normalizado ×1000 al leer el importe
  return "eur_cups"
}

function tramoComisionBase(payload: Record<string, unknown>, tipo: string): number {
  const eur = Number(payload.comision_eur)
  const porMw = Number(payload.comision_por_mw)
  if (tipo === "fijo_kwh" && Number.isFinite(eur)) return eur * 1000
  if (tipo === "fijo_mwh" && Number.isFinite(porMw)) return porMw
  if (Number.isFinite(eur)) return eur
  return Number.isFinite(porMw) ? porMw : 0
}

async function fetchAllEnertechComisiones(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>
): Promise<MarcoRetributivoResult<EnertechComisionRow[]>> {
  const all: EnertechComisionRow[] = []
  let from = 0

  while (true) {
    const { data, error } = await client
      .from("enertech_comisiones")
      .select(ENERTECH_COMISIONES_SELECT)
      .is("removed_at", null)
      .range(from, from + ENERTECH_COMISIONES_PAGE_SIZE - 1)

    if (error) return mapError(error)

    const batch = (data ?? []) as unknown as EnertechComisionRow[]
    all.push(...batch)
    if (batch.length < ENERTECH_COMISIONES_PAGE_SIZE) break
    from += ENERTECH_COMISIONES_PAGE_SIZE
  }

  return { ok: true, data: all }
}

function groupEnertechComisiones(rows: EnertechComisionRow[]): MarcoRetributivoRow[] {
  const groups = new Map<string, { campania: string; peaje: string; rows: EnertechComisionRow[] }>()

  for (const row of rows) {
    const payload = row.payload ?? {}
    const campania = String(payload.campania ?? "").trim()
    const peaje = String(payload.tarifa ?? "").trim()
    if (!campania || !peaje) continue
    const key = `${campania.toLowerCase()}::${peaje.toLowerCase()}`
    const group = groups.get(key) ?? { campania, peaje, rows: [] }
    group.rows.push(row)
    groups.set(key, group)
  }

  const now = new Date().toISOString()
  const result: MarcoRetributivoRow[] = []

  for (const { campania, peaje, rows: groupRows } of groups.values()) {
    const first = groupRows[0]!
    const nested = Array.isArray(first.enertech_comercializadoras)
      ? first.enertech_comercializadoras[0]
      : first.enertech_comercializadoras
    const compania = nested?.nombre?.trim() ?? ""

    const tramos: MarcoConsumoTramo[] = []
    for (const row of groupRows) {
      const payload = row.payload ?? {}
      const tipoComision = String(payload.tipo_comision ?? "fijo_contrato")
      const range = parseTramoRangeKwh(String(payload.tramo ?? ""))
      tramos.push({
        desde_kwh: range?.desde ?? 0,
        hasta_kwh: range?.hasta ?? Number.MAX_SAFE_INTEGER,
        comision_base: tramoComisionBase(payload, tipoComision),
        unidad: tramoUnidadFromTipoComision(tipoComision),
        condicion: String(payload.tramo ?? "") || undefined,
      })
    }
    tramos.sort((a, b) => a.desde_kwh - b.desde_kwh)

    const tipo: "luz" | "gas" = /gas/i.test(campania) || /rl\d/i.test(peaje) ? "gas" : "luz"
    const segmento = inferSegmentoFromText(campania)
    const baseComision = tramos[0]?.comision_base ?? 0

    result.push({
      id: catalogSlugToUuid(`comision:${campania.toLowerCase()}::${peaje.toLowerCase()}`),
      compania,
      tarifa: campania,
      tipo,
      peaje,
      segmento,
      condicion_1: null,
      condicion_2: null,
      condiciones: null,
      comision_tipo: "fija",
      comision_base: baseComision,
      comision_unidad: tramos[0]?.unidad ?? "eur_cups",
      vigencia_meses: 12,
      fecha_inicio: now,
      activo: true,
      created_at: now,
      updated_at: now,
      updated_by: null,
      energia_p1: null,
      energia_p2: null,
      energia_p3: null,
      energia_p4: null,
      energia_p5: null,
      energia_p6: null,
      potencia_p1: null,
      potencia_p2: null,
      potencia_p3: null,
      potencia_p4: null,
      potencia_p5: null,
      potencia_p6: null,
      tramos,
      source: "manual",
    })
  }

  return result
}

export async function listMarcoRetributivo(): Promise<
  MarcoRetributivoResult<MarcoRetributivoRow[]>
> {
  const clientOrError = requireClient()
  if (isMarcoClientError(clientOrError)) {
    return { ok: true, data: [] }
  }

  const rowsResult = await fetchAllEnertechComisiones(clientOrError)
  if (rowsResult.ok === false) return rowsResult

  const grouped = groupEnertechComisiones(rowsResult.data)
    .map(mapRow)
    .filter((row) => !isMarcoGenericPlaceholderTariff(row))

  return { ok: true, data: grouped }
}

/** Todas las entradas (incl. placeholders) para deduplicación persistente. */
export async function listMarcoRetributivoForDedup(): Promise<
  MarcoRetributivoResult<MarcoRetributivoRow[]>
> {
  const clientOrError = requireClient()
  if (isMarcoClientError(clientOrError)) {
    return { ok: true, data: [] }
  }

  const rowsResult = await fetchAllEnertechComisiones(clientOrError)
  if (rowsResult.ok === false) return rowsResult

  return { ok: true, data: groupEnertechComisiones(rowsResult.data).map(mapRow) }
}

const MARCO_DEACTIVATE_BATCH = 40

const MARCO_RETIRED_MESSAGE =
  "Marco retributivo manual retirado: los precios y comisiones ahora vienen solo de Enertech."

export async function bulkDeactivateMarcoEntries(
  ids: string[],
  updatedBy?: string | null
): Promise<MarcoRetributivoResult<number>> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return { ok: true, data: 0 }

  const clientOrError = requireClient()
  if (isMarcoClientError(clientOrError)) {
    return clientOrError
  }

  let deactivated = 0
  const stamp = new Date().toISOString()

  for (let offset = 0; offset < unique.length; offset += MARCO_DEACTIVATE_BATCH) {
    const batch = unique.slice(offset, offset + MARCO_DEACTIVATE_BATCH)
    const { error } = await clientOrError
      .from("marco_retributivo")
      .update({
        activo: false,
        updated_at: stamp,
        updated_by: updatedBy ?? null,
      })
      .in("id", batch)

    if (error) {
      if (isMarcoTableMissingError(error)) return { ok: false, message: MARCO_RETIRED_MESSAGE }
      return mapError(error)
    }
    deactivated += batch.length
  }

  return { ok: true, data: deactivated }
}

export async function createMarcoEntry(
  entry: NewMarcoEntryInput,
  updatedBy?: string | null
): Promise<MarcoRetributivoResult<MarcoRetributivoRow>> {
  const clientOrError = requireClient()
  if (isMarcoClientError(clientOrError)) {
    return clientOrError
  }

  const { data, error } = await clientOrError
    .from("marco_retributivo")
    .insert({
      compania: entry.compania,
      tarifa: entry.tarifa,
      tipo: entry.tipo,
      peaje: entry.peaje,
      segmento: entry.segmento,
      condicion_1: entry.condicion_1 ?? null,
      condicion_2: entry.condicion_2 ?? null,
      condiciones: entry.condiciones ?? null,
      comision_tipo: entry.comision_tipo,
      comision_base: entry.comision_base,
      comision_unidad: entry.comision_unidad,
      vigencia_meses: entry.vigencia_meses,
      fecha_inicio: entry.fecha_inicio,
      activo: entry.activo ?? true,
      source: "manual",
      at_marco_id: null,
      updated_by: updatedBy ?? null,
    })
    .select(MARCO_SELECT)
    .single()

  if (error) {
    if (isMarcoTableMissingError(error)) return { ok: false, message: MARCO_RETIRED_MESSAGE }
    return mapError(error)
  }
  return { ok: true, data: mapRow(data as MarcoRetributivoRow) }
}

export async function updateMarcoEntry(
  id: string,
  patch: Partial<MarcoEntryInput>,
  updatedBy?: string | null
): Promise<MarcoRetributivoResult<MarcoRetributivoRow>> {
  const clientOrError = requireClient()
  if (isMarcoClientError(clientOrError)) {
    return clientOrError
  }

  const { data, error } = await clientOrError
    .from("marco_retributivo")
    .update(toDbPatch(patch, updatedBy ?? null))
    .eq("id", id)
    .select(MARCO_SELECT)
    .single()

  if (error) {
    if (isMarcoTableMissingError(error)) return { ok: false, message: MARCO_RETIRED_MESSAGE }
    return mapError(error)
  }
  return { ok: true, data: mapRow(data as MarcoRetributivoRow) }
}

export async function deleteMarcoEntry(
  id: string,
  updatedBy?: string | null
): Promise<MarcoRetributivoResult<void>> {
  const clientOrError = requireClient()
  if (isMarcoClientError(clientOrError)) {
    return clientOrError
  }

  const { error } = await clientOrError
    .from("marco_retributivo")
    .update({
      activo: false,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy ?? null,
    })
    .eq("id", id)

  if (error) {
    if (isMarcoTableMissingError(error)) return { ok: false, message: MARCO_RETIRED_MESSAGE }
    return mapError(error)
  }
  return { ok: true, data: undefined }
}

const DEFAULT_COMMISSION_PERCENTAGE = 70

export interface ComisionParaComercialResult {
  comisionEmpresa: number
  comisionComercial: number
  detalle: string
}

export function resolveMarcoCatalogEntry(
  marcoEntryId: string | undefined,
  compania: string,
  tarifa: string,
  tipo: "luz" | "gas",
  localRows: MarcoRetributivoRow[] = []
): MarcoRetributivoEntry | null {
  if (marcoEntryId) {
    const fromRows = localRows.find((r) => r.id === marcoEntryId)
    if (fromRows) return marcoRowToCatalogEntry(fromRows)
  }
  const byMeta = localRows.find(
    (r) => r.compania === compania && r.tarifa === tarifa && r.tipo === tipo
  )
  return byMeta ? marcoRowToCatalogEntry(byMeta) : null
}

export async function getMarcoEntryById(
  marcoEntryId: string
): Promise<MarcoRetributivoResult<MarcoRetributivoEntry>> {
  const rowResult = await getMarcoRowById(marcoEntryId)
  if (rowResult.ok === false) return rowResult
  return { ok: true, data: marcoRowToCatalogEntry(rowResult.data) }
}

export async function getMarcoRowById(
  marcoEntryId: string
): Promise<MarcoRetributivoResult<MarcoRetributivoRow>> {
  const result = await listMarcoRetributivoForDedup()
  if (result.ok === false) return result
  const row = result.data.find((r) => r.id === marcoEntryId)
  if (!row) return { ok: false, message: "Entrada de marco retributivo no encontrada" }
  return { ok: true, data: row }
}

/**
 * @deprecated Los `at_marco_id`/`at_rate_id` eran claves de AT; Enertech no tiene equivalente,
 * así que esto ya no puede resolver nada. Mantenido por compatibilidad con los llamadores.
 */
export async function getMarcoRowByAtIds(_input: {
  atMarcoId?: string
  atRateId?: string
}): Promise<MarcoRetributivoResult<MarcoRetributivoRow>> {
  return { ok: false, message: "Entrada de marco retributivo no encontrada" }
}

async function fetchComercialCommissionPercentage(comercialId: string): Promise<number> {
  if (!isSupabaseConfigured()) return DEFAULT_COMMISSION_PERCENTAGE

  const client = getSupabaseClient()
  if (!client) return DEFAULT_COMMISSION_PERCENTAGE

  const { data, error } = await client
    .from("user_profiles")
    .select("commission_percentage")
    .eq("id", comercialId)
    .maybeSingle()

  if (error || data?.commission_percentage == null) {
    return DEFAULT_COMMISSION_PERCENTAGE
  }

  const pct = Number(data.commission_percentage)
  return Number.isFinite(pct) ? pct : DEFAULT_COMMISSION_PERCENTAGE
}

export async function getComisionParaComercial(
  marcoEntryId: string,
  comercialId: string,
  consumoAnual: number,
  formatCurrency: (val: number) => string = (v) => `${v.toFixed(2)} €`
): Promise<ComisionParaComercialResult> {
  const entryResult = await getMarcoEntryById(marcoEntryId)
  if (entryResult.ok === false) {
    throw new Error(entryResult.message)
  }

  const commissionPercentage = await fetchComercialCommissionPercentage(comercialId)
  return computeComisionBreakdown(
    entryResult.data,
    commissionPercentage,
    consumoAnual,
    formatCurrency
  )
}
