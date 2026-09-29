import {
  COMPANIA_LABELS,
  formatCompaniaLabel,
  resolveCompaniaLogoKey,
} from "@/lib/erp/compania-logos"
import { tarifaNamesMatchForComparador } from "@/lib/comparador-marco-name-match"
import type { MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"

/** Resuelve comercializadora emparejando el nombre de tarifa del contrato con el marco retributivo. */
export function resolveCompaniaFromMarcoTarifa(
  tariffName: string | null | undefined,
  marcoRows: readonly MarcoRetributivoRow[] | null | undefined
): string | null {
  const needle = tariffName?.trim()
  if (!needle || !marcoRows?.length) return null

  for (const row of marcoRows) {
    if (!row.tarifa?.trim() || !row.compania?.trim()) continue
    if (!tarifaNamesMatchForComparador(row.tarifa, needle)) continue

    const key = resolveCompaniaLogoKey(row.compania)
    if (key) return COMPANIA_LABELS[key]
    return formatCompaniaLabel(row.compania)
  }

  return null
}
