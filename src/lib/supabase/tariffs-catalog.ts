import {
  comparadorAccessTariffDbIlikePattern,
  tariffMatchesComparadorAccessTariff,
} from "../comparador-access-tariff"
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

interface TariffPriceDbRow {
  period: string
  energy_price_kwh: number | string | null
  power_price_kw_day: number | string | null
}

interface ProviderDbRow {
  id?: string
  name?: string
  logo_url?: string | null
}

interface TariffDbRow {
  id: string
  name: string
  supply_type: string
  access_tariff: string
  segment: string
  is_indexed: boolean | null
  sva_price_monthly: number | string | null
  is_solar_rate: boolean | null
  at_rate_id: string | null
  provider_id: string | null
  providers: ProviderDbRow | ProviderDbRow[] | null
  tariff_prices: TariffPriceDbRow[] | null
}

const TARIFFS_WITH_PRICES_SELECT = `
  id,
  name,
  supply_type,
  access_tariff,
  segment,
  is_indexed,
  sva_price_monthly,
  is_solar_rate,
  at_rate_id,
  provider_id,
  providers ( id, name, logo_url ),
  tariff_prices ( period, energy_price_kwh, power_price_kw_day )
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

export function groupTariffPrices(
  rows: TariffPriceDbRow[] | null | undefined
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

function resolveProviderName(row: TariffDbRow): {
  providerId: string | null
  providerName: string
  providerLogoUrl: string | null
} {
  const nested = Array.isArray(row.providers) ? row.providers[0] : row.providers
  return {
    providerId: row.provider_id ?? nested?.id ?? null,
    providerName: nested?.name?.trim() || "Sin compañía",
    providerLogoUrl: nested?.logo_url?.trim() || null,
  }
}

export function mapTariffRowToConPrecios(row: TariffDbRow): TariffConPrecios {
  const { providerId, providerName, providerLogoUrl } = resolveProviderName(row)
  return {
    tariffId: row.id,
    name: row.name,
    providerName,
    providerId,
    providerLogoUrl,
    supplyType: row.supply_type,
    accessTariff: row.access_tariff,
    segment: row.segment,
    isIndexed: Boolean(row.is_indexed),
    svaPriceMonthly: asNumber(row.sva_price_monthly),
    isSolarRate: Boolean(row.is_solar_rate),
    atRateId: row.at_rate_id,
    precios: groupTariffPrices(row.tariff_prices),
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
    .from("tariffs")
    .select(TARIFFS_WITH_PRICES_SELECT)
    .eq("segment", segmento)
    .ilike("access_tariff", comparadorAccessTariffDbIlikePattern(accessTariff))
    .eq("is_active", true)
    .eq("erp_active", true)
    .eq("supply_type", "luz")
    .order("name")

  if (error) return mapError(error)

  const rows = ((data ?? []) as TariffDbRow[])
    .filter((row) => tariffMatchesComparadorAccessTariff(row.access_tariff, accessTariff))
    .map(mapTariffRowToConPrecios)
    .filter((row) => Object.keys(row.precios).length > 0)

  return { ok: true, data: rows }
}
