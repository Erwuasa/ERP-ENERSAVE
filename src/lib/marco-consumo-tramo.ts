import type { MarcoRetributivoEntry } from "@/data/marco-retributivo-catalog"

export interface MarcoConsumoTramo {
  desde_kwh: number
  hasta_kwh: number
  comision_base?: number
  condicion?: string
  unidad?: MarcoRetributivoEntry["comisionUnidad"]
}

export type MarcoTramoPrecision = "exacto" | "estimado" | "sin_datos"

export interface MarcoTramoResolution {
  entry: MarcoRetributivoEntry | null
  precision: MarcoTramoPrecision
  condicionLabel: string
  comisionMin: number | null
  comisionMax: number | null
}

function parseNumericToken(raw: string): number | null {
  const trimmed = raw.replace(/\s/g, "")
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

function parseRangeFromText(text: string): { desde: number; hasta: number } | null {
  const normalized = text.trim()
  if (!normalized) return null

  const mwhRange = normalized.match(
    /(\d+(?:[.,]\d+)?)\s*(?:–|-|\.\.\.|a)\s*(\d+(?:[.,]\d+)?)\s*mwh/i
  )
  if (mwhRange) {
    const desde = parseNumericToken(mwhRange[1])
    const hasta = parseNumericToken(mwhRange[2])
    if (desde != null && hasta != null) {
      return { desde: desde * 1000, hasta: hasta * 1000 }
    }
  }

  const kwhRange = normalized.match(
    /(\d+(?:[.,\d]+)?)\s*(?:–|-|A|a|\.\.\.)\s*(\d+(?:[.,\d]+)?)/i
  )
  if (kwhRange) {
    const desde = parseNumericToken(kwhRange[1])
    const hasta = parseNumericToken(kwhRange[2])
    if (desde != null && hasta != null) return { desde, hasta }
  }

  const upperBound = normalized.match(/(?:hasta|≤|<)\s*(\d+(?:[.,\d]+)?)/i)
  if (upperBound) {
    const hasta = parseNumericToken(upperBound[1])
    if (hasta != null) return { desde: 0, hasta }
  }

  return null
}

export function parseMarcoConsumoTramos(entry: MarcoRetributivoEntry): MarcoConsumoTramo[] {
  if (entry.tramos?.length) return entry.tramos

  const desdeDb = entry.atKwhMin
  const hastaDb = entry.atKwhMax
  if (desdeDb != null || hastaDb != null) {
    return [
      {
        desde_kwh: desdeDb ?? 0,
        hasta_kwh: hastaDb ?? Number.MAX_SAFE_INTEGER,
        comision_base: entry.comisionBase,
        condicion: formatMarcoCondicionLabel(entry),
        unidad: entry.comisionUnidad,
      },
    ]
  }

  const range =
    parseRangeFromText(entry.condicion1 ?? "") ??
    parseRangeFromText(entry.condicion2 ?? "") ??
    parseRangeFromText(entry.condiciones ?? "")

  if (!range) return []

  return [
    {
      desde_kwh: range.desde,
      hasta_kwh: range.hasta,
      comision_base: entry.comisionBase,
      condicion: formatMarcoCondicionLabel(entry),
      unidad: entry.comisionUnidad,
    },
  ]
}

export function formatMarcoCondicionLabel(entry: MarcoRetributivoEntry): string {
  return [entry.condicion1, entry.condicion2].filter(Boolean).join(" · ").trim()
}

export function formatTramoCondicionMwh(tramo: MarcoConsumoTramo): string | null {
  if (!Number.isFinite(tramo.desde_kwh) || !Number.isFinite(tramo.hasta_kwh)) return null
  const desdeMwh = tramo.desde_kwh / 1000
  const hastaMwh = tramo.hasta_kwh >= 999_999_000 ? null : tramo.hasta_kwh / 1000

  const formatValue = (value: number) => {
    const rounded = Math.round(value * 100) / 100
    if (Number.isInteger(rounded)) return String(rounded)
    return rounded.toFixed(2).replace(/\.?0+$/, "").replace(".", ",")
  }

  if (hastaMwh == null) {
    if (desdeMwh <= 0) return "30-∞ MWh"
    return `${formatValue(desdeMwh)}-∞ MWh`
  }
  if (desdeMwh === hastaMwh) return `${formatValue(desdeMwh)} MWh`
  return `${formatValue(desdeMwh)}-${formatValue(hastaMwh)} MWh`
}

function tramoMatchesConsumo(tramo: MarcoConsumoTramo, consumoKwh: number): boolean {
  const min = tramo.desde_kwh ?? 0
  const max = tramo.hasta_kwh ?? Number.MAX_SAFE_INTEGER
  return consumoKwh >= min && consumoKwh <= max
}

export function computeTramoCommissionEur(
  tramo: MarcoConsumoTramo,
  commissionPercentage: number,
  consumoKwh: number
): number {
  const rate = commissionPercentage / 100
  const base = tramo.comision_base ?? 0

  if (tramo.unidad === "eur_mwh") {
    const mwh = consumoKwh / 1000
    return Math.round(mwh * base * rate * 100) / 100
  }

  return Math.round(base * rate * 100) / 100
}

function effectiveTramoCommissionReference(
  tramo: MarcoConsumoTramo,
  referenceKwh: number
): number {
  if (tramo.unidad === "eur_mwh") {
    return computeTramoCommissionEur(tramo, 100, referenceKwh)
  }
  return tramo.comision_base ?? 0
}

function entryComisionBase(entry: MarcoRetributivoEntry): number {
  return entry.comisionBase
}

export function groupMarcoEntriesByTarifa(
  entries: MarcoRetributivoEntry[]
): Map<string, MarcoRetributivoEntry[]> {
  const groups = new Map<string, MarcoRetributivoEntry[]>()
  for (const entry of entries) {
    const key = `${entry.compania}::${entry.tipo}::${entry.peaje}::${entry.tarifa}`
    const list = groups.get(key) ?? []
    list.push(entry)
    groups.set(key, list)
  }
  return groups
}

export function dedupeMarcoTariffsForSelect(entries: MarcoRetributivoEntry[]): MarcoRetributivoEntry[] {
  const groups = groupMarcoEntriesByTarifa(entries)
  const deduped: MarcoRetributivoEntry[] = []

  for (const group of groups.values()) {
    if (group.length === 1) {
      deduped.push(group[0]!)
      continue
    }
    const sorted = [...group].sort((a, b) => a.comisionBase - b.comisionBase)
    deduped.push(sorted[0]!)
  }

  return deduped.sort((a, b) => a.tarifa.localeCompare(b.tarifa, "es"))
}

export function findMarcoTramoCandidates(
  catalog: MarcoRetributivoEntry[],
  params: { compania: string; tarifa: string; tipo: "luz" | "gas" }
): MarcoRetributivoEntry[] {
  return catalog.filter(
    (entry) =>
      entry.compania === params.compania &&
      entry.tarifa === params.tarifa &&
      entry.tipo === params.tipo
  )
}

export function resolveMarcoTramoForConsumo(
  candidates: MarcoRetributivoEntry[],
  consumoKwh: number | null
): MarcoTramoResolution {
  if (candidates.length === 0) {
    return {
      entry: null,
      precision: "sin_datos",
      condicionLabel: "",
      comisionMin: null,
      comisionMax: null,
    }
  }

  if (candidates.length === 1 && parseMarcoConsumoTramos(candidates[0]!).length <= 1) {
    const entry = candidates[0]!
    return {
      entry,
      precision: "exacto",
      condicionLabel: formatMarcoCondicionLabel(entry),
      comisionMin: entryComisionBase(entry),
      comisionMax: entryComisionBase(entry),
    }
  }

  const expanded: Array<{ entry: MarcoRetributivoEntry; tramo: MarcoConsumoTramo }> = []
  for (const entry of candidates) {
    const tramos = parseMarcoConsumoTramos(entry)
    if (tramos.length === 0) {
      expanded.push({
        entry,
        tramo: {
          desde_kwh: 0,
          hasta_kwh: Number.MAX_SAFE_INTEGER,
          comision_base: entry.comisionBase,
          condicion: formatMarcoCondicionLabel(entry),
        },
      })
      continue
    }
    for (const tramo of tramos) {
      expanded.push({ entry, tramo })
    }
  }

  const comisionValues = expanded
    .map(({ tramo }) => {
      if (tramo.unidad === "eur_mwh") {
        return effectiveTramoCommissionReference(tramo, tramo.desde_kwh || 10000)
      }
      return tramo.comision_base ?? 0
    })
    .filter((value) => Number.isFinite(value))
  const comisionMin = comisionValues.length ? Math.min(...comisionValues) : null
  const comisionMaxValues = expanded.map(({ tramo }) => {
    if (tramo.unidad === "eur_mwh") {
      return effectiveTramoCommissionReference(tramo, 50000)
    }
    return tramo.comision_base ?? 0
  })
  const comisionMax = comisionMaxValues.length ? Math.max(...comisionMaxValues) : null

  if (consumoKwh == null || consumoKwh <= 0 || !Number.isFinite(consumoKwh)) {
    return {
      entry: candidates[0] ?? null,
      precision: "estimado",
      condicionLabel:
        comisionMin != null && comisionMax != null && comisionMin !== comisionMax
          ? `Tramo estimado · rango ${comisionMin.toFixed(2)}–${comisionMax.toFixed(2)} €`
          : formatMarcoCondicionLabel(candidates[0]!),
      comisionMin,
      comisionMax,
    }
  }

  const exact = expanded.find(({ tramo }) => tramoMatchesConsumo(tramo, consumoKwh))
  if (exact) {
    const condicion =
      exact.tramo.condicion?.trim() ||
      formatMarcoCondicionLabel(exact.entry) ||
      `Tramo ${exact.tramo.desde_kwh.toLocaleString("es-ES")}–${exact.tramo.hasta_kwh.toLocaleString("es-ES")} kWh`
    const exactCommission = computeTramoCommissionEur(exact.tramo, 100, consumoKwh)
    return {
      entry: exact.entry,
      precision: "exacto",
      condicionLabel: condicion,
      comisionMin: exactCommission,
      comisionMax: exactCommission,
    }
  }

  return {
    entry: candidates[0] ?? null,
    precision: "estimado",
    condicionLabel:
      comisionMin != null && comisionMax != null
        ? `Sin tramo exacto para ${consumoKwh.toLocaleString("es-ES")} kWh/año · rango ${comisionMin.toFixed(2)}–${comisionMax.toFixed(2)} €`
        : `Sin tramo exacto para ${consumoKwh.toLocaleString("es-ES")} kWh/año`,
    comisionMin,
    comisionMax,
  }
}

export function parseMarcoTramosJson(raw: unknown): MarcoConsumoTramo[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): MarcoConsumoTramo | null => {
      if (!item || typeof item !== "object") return null
      const row = item as Record<string, unknown>
      const desde = Number(row.desde_kwh)
      const hasta = Number(row.hasta_kwh)
      if (!Number.isFinite(desde) || !Number.isFinite(hasta)) return null
      const comisionBase = row.comision_base == null ? undefined : Number(row.comision_base)
      const unidad = row.unidad
      return {
        desde_kwh: desde,
        hasta_kwh: hasta,
        comision_base: Number.isFinite(comisionBase) ? comisionBase : undefined,
        condicion: typeof row.condicion === "string" ? row.condicion : undefined,
        unidad:
          unidad === "eur_cups" ||
          unidad === "eur_mwh" ||
          unidad === "porcentaje_facturado" ||
          unidad === "porcentaje_consumo" ||
          unidad === "porcentaje_termino"
            ? unidad
            : undefined,
      }
    })
    .filter((item): item is MarcoConsumoTramo => item != null)
}
