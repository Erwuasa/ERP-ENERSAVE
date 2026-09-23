import { listMarcoRowsToDeactivate } from "./marco-dedup"
import { listTariffIdsToDeactivate } from "./tariff-catalog-dedup"
import {
  bulkDeactivateMarcoEntries,
  listMarcoRetributivoForDedup,
} from "./supabase/marco-retributivo"
import {
  bulkSetTariffsErpInactive,
  listAllTariffsConPreciosForDedup,
} from "./supabase/tariffs-catalog"

const DEDUP_STORAGE_PREFIX = "enersave-catalog-dedup"
const DEDUP_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000

export interface CatalogDedupPersistResult {
  marcoDeactivated: number
  tariffsDeactivated: number
}

function storageKey(scope: "marco" | "tariffs"): string {
  return `${DEDUP_STORAGE_PREFIX}-${scope}-v2`
}

export function shouldRunCatalogDedup(scope: "marco" | "tariffs"): boolean {
  if (typeof window === "undefined") return false
  try {
    const raw = window.localStorage.getItem(storageKey(scope))
    if (!raw) return true
    const last = Number(raw)
    if (!Number.isFinite(last)) return true
    return Date.now() - last >= DEDUP_MIN_INTERVAL_MS
  } catch {
    return true
  }
}

export function markCatalogDedupRan(scope: "marco" | "tariffs"): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(storageKey(scope), String(Date.now()))
  } catch {
    /* ignore */
  }
}

export async function persistMarcoCatalogDedup(
  updatedBy?: string | null
): Promise<CatalogDedupPersistResult> {
  const listed = await listMarcoRetributivoForDedup()
  if (listed.ok === false) {
    throw new Error(listed.message)
  }

  const toDeactivate = listMarcoRowsToDeactivate(listed.data)
  if (toDeactivate.length === 0) {
    return { marcoDeactivated: 0, tariffsDeactivated: 0 }
  }

  const result = await bulkDeactivateMarcoEntries(
    toDeactivate.map((row) => row.id),
    updatedBy
  )
  if (result.ok === false) throw new Error(result.message)

  return { marcoDeactivated: result.data, tariffsDeactivated: 0 }
}

export async function persistTariffCatalogDedup(): Promise<CatalogDedupPersistResult> {
  const listed = await listAllTariffsConPreciosForDedup()
  if (listed.ok === false) {
    throw new Error(listed.message)
  }

  const ids = listTariffIdsToDeactivate(listed.data)
  if (ids.length === 0) {
    return { marcoDeactivated: 0, tariffsDeactivated: 0 }
  }

  const result = await bulkSetTariffsErpInactive(ids)
  if (result.ok === false) throw new Error(result.message)

  return { marcoDeactivated: 0, tariffsDeactivated: result.data }
}

export async function persistFullCatalogDedup(
  updatedBy?: string | null
): Promise<CatalogDedupPersistResult> {
  const marco = await persistMarcoCatalogDedup(updatedBy)
  const tariffs = await persistTariffCatalogDedup()
  return {
    marcoDeactivated: marco.marcoDeactivated,
    tariffsDeactivated: tariffs.tariffsDeactivated,
  }
}
