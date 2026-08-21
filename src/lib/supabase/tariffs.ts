import { getSupabaseClient, isSupabaseConfigured } from "./client"

export interface TariffPriceRow {
  period: string
  energy_price_kwh: number
  power_price_kw_day: number
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
  provider: { id: string; name: string } | null
  tariff_prices: TariffPriceRow[]
}

export type TariffCatalogResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string }

export interface TariffWebSettingsPatch {
  web_visible: boolean
  web_alias: string | null
}

const TARIFF_CATALOG_SELECT = `
  id,
  name,
  supply_type,
  access_tariff,
  segment,
  web_visible,
  web_alias,
  web_sort_order,
  pricing_model,
  is_indexed,
  at_rate_id,
  provider:providers(id, name),
  tariff_prices(period, energy_price_kwh, power_price_kw_day)
`

function mapError(error: { message: string }): TariffCatalogResult<never> {
  return { ok: false, message: error.message }
}

function normalizeRow(row: TariffCatalogRow): TariffCatalogRow {
  const provider = Array.isArray(row.provider) ? row.provider[0] ?? null : row.provider
  return {
    ...row,
    provider,
    tariff_prices: row.tariff_prices ?? [],
  }
}

export async function listTariffCatalog(): Promise<TariffCatalogResult<TariffCatalogRow[]>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase no configurado" }
  }

  const client = getSupabaseClient()
  if (!client) return { ok: false, message: "Cliente Supabase no disponible" }

  const { data, error } = await client
    .from("tariffs")
    .select(TARIFF_CATALOG_SELECT)
    .eq("is_active", true)
    .order("name")

  if (error) return mapError(error)

  return {
    ok: true,
    data: ((data ?? []) as unknown as TariffCatalogRow[]).map(normalizeRow),
  }
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
