import {
  marcoRetributivoCatalog,
  type MarcoRetributivoEntry,
} from "../../data/marco-retributivo-catalog"
import { computeComisionBreakdown } from "../marco-commission"
import { getSupabaseClient, isSupabaseConfigured } from "./client"

export type MarcoComisionUnidad =
  | "eur_cups"
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
  const t = text.toLowerCase()
  if (t.includes("comunidad") || t.includes("vecinos")) return "comunidades"
  if (t.includes("autónom") || t.includes("autonom")) return "autonomo"
  if (
    t.includes("pyme") ||
    t.includes("industrial") ||
    t.includes("negocio") ||
    t.includes("empresa")
  ) {
    return "pyme"
  }
  return "residencial"
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
  "id, compania, tarifa, tipo, peaje, segmento, condicion_1, condicion_2, condiciones, comision_tipo, comision_base, comision_unidad, vigencia_meses, fecha_inicio, activo, created_at, updated_at, updated_by, energia_p1, energia_p2, energia_p3, energia_p4, energia_p5, energia_p6, potencia_p1, potencia_p2, potencia_p3, potencia_p4, potencia_p5, potencia_p6"

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
  return {
    id: row.id,
    compania: row.compania,
    tarifa: row.tarifa,
    tipo: row.tipo,
    peaje: row.peaje,
    condiciones:
      row.condiciones ??
      [row.condicion_1, row.condicion_2].filter(Boolean).join(" ") ??
      "",
    comisionTipo: row.comision_tipo,
    comisionBase: row.comision_base,
    comisionUnidad: row.comision_unidad,
    vigenciaMeses: row.vigencia_meses,
  }
}

export function getFallbackMarcoCatalog(): MarcoRetributivoRow[] {
  return marcoRetributivoCatalog.map(catalogEntryToRow)
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
  if (patch.vigencia_meses !== undefined) row.vigencia_meses = patch.vigencia_meses
  if (patch.fecha_inicio !== undefined) row.fecha_inicio = patch.fecha_inicio
  if (patch.activo !== undefined) row.activo = patch.activo
  return row
}

export async function listMarcoRetributivo(): Promise<
  MarcoRetributivoResult<MarcoRetributivoRow[]>
> {
  const clientOrError = requireClient()
  if (isMarcoClientError(clientOrError)) {
    return { ok: true, data: getFallbackMarcoCatalog() }
  }

  const { data, error } = await clientOrError
    .from("marco_retributivo")
    .select(MARCO_SELECT)
    .eq("activo", true)
    .order("compania")
    .order("tarifa")

  if (error) {
    if (
      error.message.includes("does not exist") ||
      error.message.includes("relation") ||
      error.message.includes("schema cache") ||
      error.code === "42P01" ||
      error.code === "PGRST205"
    ) {
      return { ok: true, data: getFallbackMarcoCatalog() }
    }
    return mapError(error)
  }

  const rows = ((data ?? []) as MarcoRetributivoRow[]).map(mapRow)
  if (rows.length === 0) {
    return { ok: true, data: getFallbackMarcoCatalog() }
  }
  return { ok: true, data: rows }
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
      updated_by: updatedBy ?? null,
    })
    .select(MARCO_SELECT)
    .single()

  if (error) return mapError(error)
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

  if (error) return mapError(error)
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

  if (error) return mapError(error)
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
    const fromCatalog = marcoRetributivoCatalog.find((e) => e.id === marcoEntryId)
    if (fromCatalog) return fromCatalog
  }
  return (
    marcoRetributivoCatalog.find(
      (e) => e.compania === compania && e.tarifa === tarifa && e.tipo === tipo
    ) ?? null
  )
}

export async function getMarcoEntryById(
  marcoEntryId: string
): Promise<MarcoRetributivoResult<MarcoRetributivoEntry>> {
  const clientOrError = requireClient()
  if (isMarcoClientError(clientOrError)) {
    const fallback = resolveMarcoCatalogEntry(marcoEntryId, "", "", "luz")
    if (!fallback) {
      return { ok: false, message: "Entrada de marco retributivo no encontrada" }
    }
    return { ok: true, data: fallback }
  }

  const { data, error } = await clientOrError
    .from("marco_retributivo")
    .select(MARCO_SELECT)
    .eq("id", marcoEntryId)
    .maybeSingle()

  if (error) {
    const fallback = resolveMarcoCatalogEntry(marcoEntryId, "", "", "luz")
    if (fallback) return { ok: true, data: fallback }
    return mapError(error)
  }

  if (!data) {
    const fallback = resolveMarcoCatalogEntry(marcoEntryId, "", "", "luz")
    if (!fallback) {
      return { ok: false, message: "Entrada de marco retributivo no encontrada" }
    }
    return { ok: true, data: fallback }
  }

  return { ok: true, data: marcoRowToCatalogEntry(mapRow(data as MarcoRetributivoRow)) }
}

async function fetchComercialCommissionPercentage(comercialId: string): Promise<number> {
  if (!isSupabaseConfigured()) return DEFAULT_COMMISSION_PERCENTAGE

  const client = getSupabaseClient()
  if (!client) return DEFAULT_COMMISSION_PERCENTAGE

  const { data, error } = await client
    .from("erp_comerciales")
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
