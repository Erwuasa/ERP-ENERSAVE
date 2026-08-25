import { getSupabaseClient, isSupabaseConfigured } from "./client"
import type {
  ProductoPeajeFilter,
  ProductoSuministroTab,
  ProductoTipoClienteFilter,
  ProductoWebVisibilityFilter,
} from "../productos-catalog"

export interface TariffPriceRow {
  period: string
  energy_price_kwh: number
  power_price_kw_day: number
}

export interface TariffCatalogPricesSummary {
  energia: Record<string, number>
  potencia: Record<string, number>
}

export interface TariffCatalogRow {
  id: string
  name: string
  supply_type: string
  access_tariff: string
  segment: string
  web_visible: boolean
  web_alias: string | null
  web_sort_order: number | null
  pricing_model: string | null
  is_indexed: boolean | null
  at_rate_id: string | null
  provider_id?: string | null
  provider_name?: string | null
  provider?: { id: string; name: string } | null
  tariff_prices?: TariffPriceRow[]
  prices_summary?: TariffCatalogPricesSummary
}

export type TariffCatalogResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string }

export interface TariffWebSettingsPatch {
  web_visible: boolean
  web_alias: string | null
}

export interface TariffCatalogQuery {
  suministro: ProductoSuministroTab
  compania: string
  tipoCliente: ProductoTipoClienteFilter
  peaje: ProductoPeajeFilter
  webVisibility: ProductoWebVisibilityFilter
  search: string
  limit?: number
  offset?: number
}

export interface TariffCatalogPage {
  rows: TariffCatalogRow[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
  providerCounts: Record<string, number>
  summary: {
    luz_total: number
    gas_total: number
    luz_web_visible: number
    gas_web_visible: number
    web_visible_total: number
  }
}

const PAGE_SIZE = 60

function mapError(error: { message: string }): TariffCatalogResult<never> {
  return { ok: false, message: error.message }
}

export function suministroToSupplyType(
  suministro: ProductoSuministroTab
): "luz" | "gas" | null {
  if (suministro === "telefonia") return null
  return suministro
}

export function tipoClienteToSegment(
  filter: ProductoTipoClienteFilter
): "residencial" | "pyme" | null {
  if (filter === "todos") return null
  if (filter === "empresa") return "pyme"
  return "residencial"
}

export function webVisibilityToParam(
  filter: ProductoWebVisibilityFilter
): boolean | null {
  if (filter === "publicadas") return true
  if (filter === "ocultas") return false
  return null
}

export function peajeToParam(filter: ProductoPeajeFilter): string | null {
  if (filter === "todos") return null
  return filter
}

function normalizeRow(row: TariffCatalogRow): TariffCatalogRow {
  const provider =
    row.provider ??
    (row.provider_id && row.provider_name
      ? { id: row.provider_id, name: row.provider_name }
      : row.provider_name
        ? { id: row.provider_id ?? "", name: row.provider_name }
        : null)

  return {
    ...row,
    provider,
    tariff_prices: row.tariff_prices ?? [],
    prices_summary: row.prices_summary ?? { energia: {}, potencia: {} },
  }
}

function parseCatalogPage(payload: unknown): TariffCatalogPage {
  const root = (payload ?? {}) as Record<string, unknown>
  const summary = (root.summary ?? {}) as Record<string, number>
  const providerCounts = (root.provider_counts ?? {}) as Record<string, number>
  const rows = ((root.rows ?? []) as TariffCatalogRow[]).map(normalizeRow)

  return {
    rows,
    total: Number(root.total ?? rows.length),
    limit: Number(root.limit ?? PAGE_SIZE),
    offset: Number(root.offset ?? 0),
    hasMore: Boolean(root.has_more),
    providerCounts,
    summary: {
      luz_total: Number(summary.luz_total ?? 0),
      gas_total: Number(summary.gas_total ?? 0),
      luz_web_visible: Number(summary.luz_web_visible ?? 0),
      gas_web_visible: Number(summary.gas_web_visible ?? 0),
      web_visible_total: Number(summary.web_visible_total ?? 0),
    },
  }
}

export async function listTariffCatalogPage(
  query: TariffCatalogQuery
): Promise<TariffCatalogResult<TariffCatalogPage>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase no configurado" }
  }

  const client = getSupabaseClient()
  if (!client) return { ok: false, message: "Cliente Supabase no disponible" }

  const supplyType = suministroToSupplyType(query.suministro)
  if (query.suministro === "telefonia") {
    return {
      ok: true,
      data: {
        rows: [],
        total: 0,
        limit: query.limit ?? PAGE_SIZE,
        offset: query.offset ?? 0,
        hasMore: false,
        providerCounts: {},
        summary: {
          luz_total: 0,
          gas_total: 0,
          luz_web_visible: 0,
          gas_web_visible: 0,
          web_visible_total: 0,
        },
      },
    }
  }

  const { data, error } = await client.rpc("list_tariffs_catalog_v1", {
    p_supply_type: supplyType,
    p_provider_name: query.compania === "Todas" ? null : query.compania,
    p_segment: tipoClienteToSegment(query.tipoCliente),
    p_access_tariff: peajeToParam(query.peaje),
    p_web_visible: webVisibilityToParam(query.webVisibility),
    p_search: query.search.trim() || null,
    p_limit: query.limit ?? PAGE_SIZE,
    p_offset: query.offset ?? 0,
  })

  if (error) return mapError(error)

  return { ok: true, data: parseCatalogPage(data) }
}

/** @deprecated Usar listTariffCatalogPage — conservado por compatibilidad puntual */
export async function listTariffCatalog(): Promise<TariffCatalogResult<TariffCatalogRow[]>> {
  const result = await listTariffCatalogPage({
    suministro: "luz",
    compania: "Todas",
    tipoCliente: "todos",
    peaje: "todos",
    webVisibility: "todas",
    search: "",
    limit: 200,
    offset: 0,
  })
  if (result.ok === false) return result
  return { ok: true, data: result.data.rows }
}

export async function updateTariffWebSettings(
  tariffId: string,
  patch: TariffWebSettingsPatch
): Promise<TariffCatalogResult<TariffWebSettingsPatch>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase no configurado" }
  }

  const client = getSupabaseClient()
  if (!client) return { ok: false, message: "Cliente Supabase no disponible" }

  const { data, error } = await client.rpc("update_tariff_web_settings_v1", {
    p_tariff_id: tariffId,
    p_web_visible: patch.web_visible,
    p_web_alias: patch.web_alias ?? "",
  })

  if (error) return mapError(error)

  const payload = data as {
    web_visible?: boolean
    web_alias?: string | null
  } | null

  return {
    ok: true,
    data: {
      web_visible: payload?.web_visible ?? patch.web_visible,
      web_alias: payload?.web_alias ?? patch.web_alias,
    },
  }
}

export { PAGE_SIZE as TARIFF_CATALOG_PAGE_SIZE }
