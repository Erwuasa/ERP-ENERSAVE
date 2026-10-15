import type { TariffCatalogPage, TariffCatalogRow } from "@/lib/supabase/tariffs"

function sortRows(rows: TariffCatalogRow[]): TariffCatalogRow[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, "es"))
}

function rowsById(pages: TariffCatalogPage[]): TariffCatalogRow[] {
  const byId = new Map<string, TariffCatalogRow>()
  for (const page of pages) {
    for (const row of page.rows) byId.set(row.id, row)
  }
  return sortRows([...byId.values()])
}

/** Une las páginas de un mismo nombre de comercializadora sin sumar el total dos veces. */
export function concatTariffCatalogPages(pages: TariffCatalogPage[]): TariffCatalogPage {
  const first = pages[0]
  if (!first) {
    return {
      rows: [],
      total: 0,
      limit: 0,
      offset: 0,
      hasMore: false,
      providerCounts: {},
      summary: {
        luz_total: 0,
        gas_total: 0,
        luz_web_visible: 0,
        gas_web_visible: 0,
        web_visible_total: 0,
      },
    }
  }

  const providerCounts = { ...first.providerCounts }
  for (const page of pages.slice(1)) {
    for (const [name, count] of Object.entries(page.providerCounts)) {
      providerCounts[name] = Math.max(providerCounts[name] ?? 0, count)
    }
  }

  const rows = rowsById(pages)
  return {
    ...first,
    rows,
    total: first.total,
    offset: 0,
    limit: rows.length,
    hasMore: false,
    providerCounts,
  }
}

/** Junta varias comercializadoras que la pantalla muestra como una sola compañía. */
export function mergeTariffCatalogFamilies(pages: TariffCatalogPage[]): TariffCatalogPage {
  const first = pages[0]
  if (!first) return concatTariffCatalogPages([])
  if (pages.length === 1) return { ...first, offset: 0, hasMore: false }

  const providerCounts: Record<string, number> = {}
  let total = 0
  for (const page of pages) {
    total += page.total
    for (const [name, count] of Object.entries(page.providerCounts)) {
      providerCounts[name] = Math.max(providerCounts[name] ?? 0, count)
    }
  }

  const rows = rowsById(pages)
  return {
    rows,
    total,
    limit: rows.length,
    offset: 0,
    hasMore: false,
    providerCounts,
    summary: first.summary,
  }
}
