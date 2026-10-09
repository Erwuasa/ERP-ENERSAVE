import {
  comparadorAccessTariffDbIlikePattern,
  tariffMatchesComparadorAccessTariff,
} from "../comparador-access-tariff"
import { tariffMatchesErpAudience } from "../infer-erp-segment"
import { getSupabaseClient, isSupabaseConfigured } from "./client"
import type { TariffPeriodKey, TariffPeriodPrices, TariffPreciosPorPeriodo } from "../tarifa-cost-calculator"

export type TariffsCatalogResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string }

export interface TariffConPrecios {
  tariffId: string
  name: string
  providerName: string
  providerId: string | null
  supplyType: string
  accessTariff: string
  segment: string
  isIndexed: boolean
  svaPriceMonthly: number | null
  isSolarRate: boolean
  atRateId: string | null
  providerLogoUrl: string | null
  precios: TariffPreciosPorPeriodo
}

// `tariffs`/`tariff_prices`/`providers` fueron archivadas (consolidación Enertech-only, ver
// AGENTS.md §8/§9). Este módulo lee directamente `enertech_precios` (una fila por tarifa,
// con energía/potencia P1-P6 dentro de `payload`) junto a `enertech_comercializadoras`.

interface EnertechComercializadoraRow {
  id: number
  nombre: string | null
  logo_url: string | null
}

interface EnertechPrecioRow {
  clave: string
  company_id: number | null
  payload: Record<string, unknown> | null
  web_visible: boolean | null
  erp_active: boolean | null
  segment: string | null
  is_indexed: boolean | null
  is_solar_rate: boolean | null
  sva_price_monthly: number | string | null
  enertech_comercializadoras: EnertechComercializadoraRow | EnertechComercializadoraRow[] | null
}

const ENERTECH_PRECIOS_SELECT = `
  clave,
  company_id,
  payload,
  web_visible,
  erp_active,
  segment,
  is_indexed,
  is_solar_rate,
  sva_price_monthly,
  enertech_comercializadoras ( id, nombre, logo_url )
`

function mapError(error: { message: string }): TariffsCatalogResult<never> {
  return { ok: false, message: error.message }
}

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function normalizePeriodKey(period: string): TariffPeriodKey | null {
  const match = period.trim().toUpperCase().match(/^P([1-6])$/)
  if (!match) return null
  return `P${match[1]}` as TariffPeriodKey
}

/** @deprecated conservado por compatibilidad; usar directamente el payload de enertech_precios */
export function groupTariffPrices(
  rows: Array<{ period: string; energy_price_kwh: unknown; power_price_kw_day: unknown }> | null | undefined
): TariffPreciosPorPeriodo {
  const precios: TariffPreciosPorPeriodo = {}
  for (const row of rows ?? []) {
    const key = normalizePeriodKey(String(row.period ?? ""))
    if (!key) continue
    const energy = asNumber(row.energy_price_kwh)
    const power = asNumber(row.power_price_kw_day)
    if (energy == null && power == null) continue
    precios[key] = {
      energyPriceKwh: energy ?? 0,
      powerPriceKwDay: power ?? 0,
    }
  }
  return precios
}

function pricesFromPayload(payload: Record<string, unknown> | null): TariffPreciosPorPeriodo {
  const precios: TariffPreciosPorPeriodo = {}
  if (!payload) return precios
  for (let n = 1; n <= 6; n++) {
    const energy = asNumber(payload[`e${n}`])
    const power = asNumber(payload[`p${n}`])
    if (energy == null && power == null) continue
    precios[`P${n}` as TariffPeriodKey] = {
      energyPriceKwh: energy ?? 0,
      powerPriceKwDay: power ?? 0,
    }
  }
  return precios
}

function isGasTariff(payload: Record<string, unknown> | null): boolean {
  return /gas/i.test(String(payload?.tarifa ?? ""))
}

function resolveProvider(row: EnertechPrecioRow): {
  providerId: string | null
  providerName: string
  providerLogoUrl: string | null
} {
  const nested = Array.isArray(row.enertech_comercializadoras)
    ? row.enertech_comercializadoras[0]
    : row.enertech_comercializadoras
  return {
    providerId: nested?.id != null ? String(nested.id) : row.company_id != null ? String(row.company_id) : null,
    providerName: nested?.nombre?.trim() || String(row.payload?.comercializadora ?? "").trim() || "Sin compañía",
    providerLogoUrl: nested?.logo_url?.trim() || null,
  }
}

export function mapEnertechPrecioRowToConPrecios(row: EnertechPrecioRow): TariffConPrecios {
  const { providerId, providerName, providerLogoUrl } = resolveProvider(row)
  const payload = row.payload ?? {}
  const accessTariff = String(payload.tarifa ?? "")
  return {
    tariffId: row.clave,
    name: accessTariff,
    providerName,
    providerId,
    providerLogoUrl,
    supplyType: isGasTariff(payload) ? "gas" : "luz",
    accessTariff,
    segment: row.segment ?? "residencial",
    isIndexed: Boolean(row.is_indexed),
    svaPriceMonthly: asNumber(row.sva_price_monthly),
    isSolarRate: Boolean(row.is_solar_rate),
    atRateId: null,
    precios: pricesFromPayload(payload),
  }
}

export async function listTariffsConPrecios(
  segmento: "residencial" | "pyme",
  accessTariff: string
): Promise<TariffsCatalogResult<TariffConPrecios[]>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase no configurado" }
  }

  const client = getSupabaseClient()
  if (!client) return { ok: false, message: "Cliente Supabase no disponible" }

  const { data, error } = await client
    .from("enertech_precios")
    .select(ENERTECH_PRECIOS_SELECT)
    .is("removed_at", null)
    .eq("erp_active", true)
    .ilike("payload->>tarifa", comparadorAccessTariffDbIlikePattern(accessTariff))

  if (error) return mapError(error)

  const rows = ((data ?? []) as unknown as EnertechPrecioRow[])
    .filter((row) => !isGasTariff(row.payload))
    .filter((row) => tariffMatchesComparadorAccessTariff(String(row.payload?.tarifa ?? ""), accessTariff))
    .filter((row) =>
      tariffMatchesErpAudience(
        String(row.payload?.comercializadora ?? ""),
        row.segment ?? "residencial",
        segmento,
        "",
        String(row.payload?.tarifa ?? "")
      )
    )
    .map(mapEnertechPrecioRowToConPrecios)
    .filter((row) => Object.keys(row.precios).length > 0)

  return { ok: true, data: rows }
}

const TARIFF_DEDUP_PAGE_SIZE = 250

export async function listAllTariffsConPreciosForDedup(): Promise<
  TariffsCatalogResult<TariffConPrecios[]>
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase no configurado" }
  }

  const client = getSupabaseClient()
  if (!client) return { ok: false, message: "Cliente Supabase no disponible" }

  const all: TariffConPrecios[] = []
  let from = 0

  while (true) {
    const { data, error } = await client
      .from("enertech_precios")
      .select(ENERTECH_PRECIOS_SELECT)
      .is("removed_at", null)
      .eq("erp_active", true)
      .order("clave")
      .range(from, from + TARIFF_DEDUP_PAGE_SIZE - 1)

    if (error) return mapError(error)

    const batch = ((data ?? []) as unknown as EnertechPrecioRow[])
      .map(mapEnertechPrecioRowToConPrecios)
      .filter((row) => Object.keys(row.precios).length > 0)

    all.push(...batch)
    if ((data ?? []).length < TARIFF_DEDUP_PAGE_SIZE) break
    from += TARIFF_DEDUP_PAGE_SIZE
  }

  return { ok: true, data: all }
}

const TARIFF_DEACTIVATE_BATCH = 50

export async function bulkSetTariffsErpInactive(
  tariffIds: string[]
): Promise<TariffsCatalogResult<number>> {
  const unique = [...new Set(tariffIds.filter(Boolean))]
  if (unique.length === 0) return { ok: true, data: 0 }

  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase no configurado" }
  }

  const client = getSupabaseClient()
  if (!client) return { ok: false, message: "Cliente Supabase no disponible" }

  let count = 0
  for (let offset = 0; offset < unique.length; offset += TARIFF_DEACTIVATE_BATCH) {
    const batch = unique.slice(offset, offset + TARIFF_DEACTIVATE_BATCH)
    const { error } = await client
      .from("enertech_precios")
      .update({ erp_active: false })
      .in("clave", batch)

    if (error) return mapError(error)
    count += batch.length
  }

  return { ok: true, data: count }
}
