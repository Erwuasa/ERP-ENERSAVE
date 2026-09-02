import {
  isoDate,
  num,
  resolveSupabaseClient,
  str,
  toSupabaseFailure,
  type Row,
  type SupabaseResult,
} from "./result"

export interface AtComparisonRow {
  id: string
  atComparisonId: string
  name: string
  clientName: string
  cups: string
  accessTariff: string
  currentAnnualExpense: number
  maxAnnualSavings: number
  bestTariffName: string
  signingStatus?: string
  date: string
}

export async function listAtComparisons(): Promise<SupabaseResult<AtComparisonRow[]>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client
    .from("at_comparisons")
    .select("*")
    .order("at_synced_at", { ascending: false })

  if (error) return toSupabaseFailure(error, "at_comparisons")

  return {
    ok: true,
    data: (data ?? []).map((raw) => {
      const row = raw as Row
      return {
        id: String(row.id ?? ""),
        atComparisonId: str(row.at_comparison_id) ?? "",
        name: str(row.name) ?? "",
        clientName: str(row.client_name) ?? "",
        cups: str(row.cups) ?? "",
        accessTariff: str(row.access_tariff) ?? "2.0TD",
        currentAnnualExpense: num(row.current_annual_expense) ?? 0,
        maxAnnualSavings: num(row.max_annual_savings) ?? 0,
        bestTariffName: str(row.best_tariff_name) ?? "",
        signingStatus: str(row.signing_status),
        date: isoDate(row.at_synced_at) ?? isoDate(row.created_at) ?? "",
      }
    }),
  }
}
