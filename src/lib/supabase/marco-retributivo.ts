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

async function fetchEnertechComisionesPage(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>,
  from: number
): Promise<MarcoRetributivoResult<EnertechComisionRow[]>> {
  const { data, error } = await client
    .from("enertech_comisiones")
    .select(ENERTECH_COMISIONES_SELECT)
    .is("removed_at", null)
    .range(from, from + ENERTECH_COMISIONES_PAGE_SIZE - 1)

  if (error) return mapError(error)
  return { ok: true, data: (data ?? []) as unknown as EnertechComisionRow[] }
}

/**
 * ~19k filas → ~20 páginas de 1000. Pedir el `count` exacto primero permite lanzar todas las
 * páginas en paralelo (en vez de una por una, que con el join a `enertech_comercializadoras`
 * tardaba varios segundos de red en serie y hacía sentir la pantalla de Marco Retributivo
 * "colgada"). Si el `count` falla por lo que sea, se cae al barrido secuencial de antes.
 */
async function fetchAllEnertechComisiones(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>
): Promise<MarcoRetributivoResult<EnertechComisionRow[]>> {
  const { count, error: countError } = await client
    .from("enertech_comisiones")
    .select("clave", { count: "exact", head: true })
    .is("removed_at", null)

  if (countError || count == null) {
    // Fallback: barrido secuencial página a página (comportamiento anterior).
    const all: EnertechComisionRow[] = []
    let from = 0
    while (true) {
      const page = await fetchEnertechComisionesPage(client, from)
      if (page.ok === false) return page
      all.push(...page.data)
      if (page.data.length < ENERTECH_COMISIONES_PAGE_SIZE) break
      from += ENERTECH_COMISIONES_PAGE_SIZE
    }
    return { ok: true, data: all }
  }

  const pageStarts: number[] = []
  for (let from = 0; from < count; from += ENERTECH_COMISIONES_PAGE_SIZE) pageStarts.push(from)
  if (pageStarts.length === 0) return { ok: true, data: [] }

  const pages = await Promise.all(pageStarts.map((from) => fetchEnertechComisionesPage(client, from)))
  const firstError = pages.find((p): p is { ok: false; message: string } => p.ok === false)
  if (firstError) return firstError

  const all: EnertechComisionRow[] = []
  for (const page of pages) {
    if (page.ok) all.push(...page.data)
  }
  return { ok: true, data: all }
}

/**
 * Las filas crudas de `enertech_comisiones` las usan `listMarcoRetributivo` (filtra placeholders)
 * y `listMarcoRetributivoForDedup` (todas, incl. placeholders) — y además `listMarcoRetributivo`
 * se llama dos veces seguidas en la práctica: una al montar la pantalla y otra desde la
 * comprobación automática de duplicados (`shouldRunCatalogDedup`) que corre justo después. Sin
 * esta caché de muy corta duración, eso eran dos barridos completos de ~19k filas por carga de
 * pantalla. TTL corto a propósito: es solo para colapsar peticiones simultáneas, no para servir
 * datos desactualizados.
 */
const RAW_COMISIONES_CACHE_TTL_MS = 15 * 1000
let rawComisionesCache: { data: EnertechComisionRow[]; fetchedAt: number } | null = null
let rawComisionesInflight: Promise<MarcoRetributivoResult<EnertechComisionRow[]>> | null = null

async function fetchAllEnertechComisionesCached(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>
): Promise<MarcoRetributivoResult<EnertechComisionRow[]>> {
  if (rawComisionesCache && Date.now() - rawComisionesCache.fetchedAt < RAW_COMISIONES_CACHE_TTL_MS) {
    return { ok: true, data: rawComisionesCache.data }
  }
  if (!rawComisionesInflight) {
    rawComisionesInflight = fetchAllEnertechComisiones(client).then((result) => {
      if (result.ok) rawComisionesCache = { data: result.data, fetchedAt: Date.now() }
      return result
    })
    void rawComisionesInflight.finally(() => {
      rawComisionesInflight = null
    })
  }
  return rawComisionesInflight
}

function invalidateRawComisionesCache(): void {
  rawComisionesCache = null
  rawComisionesInflight = null
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

  const rowsResult = await fetchAllEnertechComisionesCached(clientOrError)
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

  const rowsResult = await fetchAllEnertechComisionesCached(clientOrError)
  if (rowsResult.ok === false) return rowsResult

  return { ok: true, data: groupEnertechComisiones(rowsResult.data).map(mapRow) }
}

const MARCO_RETIRED_MESSAGE =
  "Marco retributivo manual retirado: los precios y comisiones ahora vienen solo de Enertech."

// --- CRUD sobre enertech_comisiones ---------------------------------------------------------
//
// Restringido por RLS a superadmin/tramitacion (private.is_marco_retributivo_manager(), migración
// 20261008120000_enertech_comisiones_manual_crud.sql). Invariante: los datos de la API Enertech
// siempre prevalecen.
// - CREAR: inserta una fila nueva con `source = 'manual'` y una clave sintética que nunca puede
//   coincidir con una clave real de la API. El motor de sync (`manualSourceColumn: 'source'` en
//   enertech-entities.ts) excluye estas filas de su cálculo de "desaparecidas del feed", así que
//   sobreviven indefinidamente a los sync — no se "pisan" por no estar en la API.
// - EDITAR una entrada ya existente (venga de la API o manual): se actualiza el payload/company_id
//   de sus filas en `enertech_comisiones` SIN tocar `source`. Si la fila era de la API, sigue
//   marcada `source = 'api'`, así que el siguiente sync la reconoce, la compara con el feed y la
//   SOBREESCRIBE con el valor real de Enertech — la edición manual es solo temporal hasta el
//   próximo sync, tal y como se pidió ("que prevalezca los datos de API").
// - BORRAR una fila de la API: borrado blando (`removed_at`) — si sigue en el feed, el próximo
//   sync la restaura igual que cualquier otra fila "desaparecida y reaparecida". BORRAR una fila
//   manual: borrado físico (permitido solo para `source = 'manual'` por la política RLS).
export async function resolveEnertechCompanyIdByName(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>,
  name: string
): Promise<number | null> {
  const trimmed = name.trim()
  if (!trimmed) return null
  const { data } = await client
    .from("enertech_comercializadoras")
    .select("id")
    .ilike("nombre", trimmed)
    .limit(1)
    .maybeSingle()
  return (data as { id: number } | null)?.id ?? null
}

function comisionUnidadToTipoComision(unidad: MarcoComisionUnidad): string {
  if (unidad === "eur_mwh") return "fijo_mwh"
  return "fijo_contrato"
}

function buildManualComisionPayload(entry: {
  tarifa: string
  peaje: string
  comision_base: number
  comision_unidad: MarcoComisionUnidad
}): Record<string, unknown> {
  const tipoComision = comisionUnidadToTipoComision(entry.comision_unidad)
  const payload: Record<string, unknown> = {
    campania: entry.tarifa,
    tarifa: entry.peaje,
    tramo: "0-999999999 kWh",
    tipo_comision: tipoComision,
  }
  if (tipoComision === "fijo_mwh") payload.comision_por_mw = entry.comision_base
  else payload.comision_eur = entry.comision_base
  return payload
}

function groupIdForCampaniaPeaje(campania: string, peaje: string): string {
  return catalogSlugToUuid(`comision:${campania.trim().toLowerCase()}::${peaje.trim().toLowerCase()}`)
}

/** Las entradas agrupadas no tienen una fila 1:1 en `enertech_comisiones`: localiza las claves
 *  reales (una por tramo) que componen el id de grupo que usa el resto del ERP. */
async function findComisionClavesForGroupId(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>,
  groupId: string
): Promise<MarcoRetributivoResult<string[]>> {
  const rowsResult = await fetchAllEnertechComisiones(client)
  if (rowsResult.ok === false) return rowsResult

  const claves: string[] = []
  for (const row of rowsResult.data) {
    const payload = row.payload ?? {}
    const campania = String(payload.campania ?? "").trim()
    const peaje = String(payload.tarifa ?? "").trim()
    if (!campania || !peaje) continue
    if (groupIdForCampaniaPeaje(campania, peaje) === groupId) claves.push(row.clave)
  }
  return { ok: true, data: claves }
}

export async function bulkDeactivateMarcoEntries(
  ids: string[],
  updatedBy?: string | null
): Promise<MarcoRetributivoResult<number>> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return { ok: true, data: 0 }

  let deactivated = 0
  for (const id of unique) {
    const result = await deleteMarcoEntry(id, updatedBy)
    if (result.ok === false) return result
    deactivated += 1
  }
  return { ok: true, data: deactivated }
}

export async function createMarcoEntry(
  entry: NewMarcoEntryInput,
  _updatedBy?: string | null
): Promise<MarcoRetributivoResult<MarcoRetributivoRow>> {
  const clientOrError = requireClient()
  if (isMarcoClientError(clientOrError)) {
    return clientOrError
  }

  const companyId = await resolveEnertechCompanyIdByName(clientOrError, entry.compania)
  const clave = `manual:${crypto.randomUUID()}`
  const payload = buildManualComisionPayload(entry)
  const now = new Date().toISOString()

  const { error } = await clientOrError.from("enertech_comisiones").insert({
    clave,
    company_id: companyId,
    payload,
    actualizado_en: now,
    source: "manual",
  })

  if (error) {
    if (isMarcoTableMissingError(error)) return { ok: false, message: MARCO_RETIRED_MESSAGE }
    return mapError(error)
  }

  invalidateRawComisionesCache()
  return getMarcoRowById(groupIdForCampaniaPeaje(entry.tarifa, entry.peaje))
}

export async function updateMarcoEntry(
  id: string,
  patch: Partial<MarcoEntryInput>,
  _updatedBy?: string | null
): Promise<MarcoRetributivoResult<MarcoRetributivoRow>> {
  const clientOrError = requireClient()
  if (isMarcoClientError(clientOrError)) {
    return clientOrError
  }

  const clavesResult = await findComisionClavesForGroupId(clientOrError, id)
  if (clavesResult.ok === false) return clavesResult
  if (clavesResult.data.length === 0) {
    return { ok: false, message: "Entrada de marco retributivo no encontrada" }
  }

  const companyId =
    patch.compania !== undefined
      ? await resolveEnertechCompanyIdByName(clientOrError, patch.compania)
      : undefined

  const payloadPatch: Record<string, unknown> = {}
  if (patch.tarifa !== undefined) payloadPatch.campania = patch.tarifa
  if (patch.peaje !== undefined) payloadPatch.tarifa = patch.peaje
  if (
    patch.comision_base !== undefined ||
    patch.comision_unidad !== undefined
  ) {
    // Se aplica el mismo importe/unidad a todos los tramos de la entrada agrupada: es una
    // simplificación deliberada (igual que antes con `marco_retributivo`), no distingue tramo a
    // tramo desde este formulario.
    const unidad = patch.comision_unidad ?? "eur_cups"
    const tipoComision = comisionUnidadToTipoComision(unidad)
    payloadPatch.tipo_comision = tipoComision
    if (tipoComision === "fijo_mwh") payloadPatch.comision_por_mw = patch.comision_base ?? 0
    else payloadPatch.comision_eur = patch.comision_base ?? 0
  }

  for (const clave of clavesResult.data) {
    const rowUpdate: Record<string, unknown> = {}
    if (companyId !== undefined) rowUpdate.company_id = companyId
    if (Object.keys(payloadPatch).length > 0) {
      const { data: current } = await clientOrError
        .from("enertech_comisiones")
        .select("payload")
        .eq("clave", clave)
        .maybeSingle()
      const currentPayload = (current as { payload: Record<string, unknown> } | null)?.payload ?? {}
      rowUpdate.payload = { ...currentPayload, ...payloadPatch }
    }
    if (Object.keys(rowUpdate).length === 0) continue

    const { error } = await clientOrError.from("enertech_comisiones").update(rowUpdate).eq("clave", clave)
    if (error) {
      if (isMarcoTableMissingError(error)) return { ok: false, message: MARCO_RETIRED_MESSAGE }
      return mapError(error)
    }
  }

  invalidateRawComisionesCache()
  return getMarcoRowById(id)
}

export async function deleteMarcoEntry(
  id: string,
  _updatedBy?: string | null
): Promise<MarcoRetributivoResult<void>> {
  const clientOrError = requireClient()
  if (isMarcoClientError(clientOrError)) {
    return clientOrError
  }

  const { data: memberRows, error: readError } = await clientOrError
    .from("enertech_comisiones")
    .select("clave, source")
    .is("removed_at", null)

  if (readError) {
    if (isMarcoTableMissingError(readError)) return { ok: false, message: MARCO_RETIRED_MESSAGE }
    return mapError(readError)
  }

  const clavesResult = await findComisionClavesForGroupId(clientOrError, id)
  if (clavesResult.ok === false) return clavesResult
  if (clavesResult.data.length === 0) {
    return { ok: false, message: "Entrada de marco retributivo no encontrada" }
  }

  const sourceByClave = new Map(
    ((memberRows ?? []) as { clave: string; source: string }[]).map((r) => [r.clave, r.source])
  )
  const manualClaves = clavesResult.data.filter((clave) => sourceByClave.get(clave) === "manual")
  const apiClaves = clavesResult.data.filter((clave) => sourceByClave.get(clave) !== "manual")

  if (manualClaves.length > 0) {
    const { error } = await clientOrError.from("enertech_comisiones").delete().in("clave", manualClaves)
    if (error) return mapError(error)
  }
  if (apiClaves.length > 0) {
    const { error } = await clientOrError
      .from("enertech_comisiones")
      .update({ removed_at: new Date().toISOString() })
      .in("clave", apiClaves)
    if (error) return mapError(error)
  }

  invalidateRawComisionesCache()
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
