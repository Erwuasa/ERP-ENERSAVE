import type { MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"

const TARIFA_NOISE_TOKENS = new Set([
  "fija",
  "tarifa",
  "luz",
  "gas",
  "facil",
  "energy",
  "energy+",
  "index",
  "indexada",
])

export function normalizeMarcoTarifaName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s*[+/]\s*/g, " con ")
    .replace(/\s+/g, " ")
    .trim()
}

export function extractMarcoTarifaCoreTokens(name: string): string[] {
  return normalizeMarcoTarifaName(name)
    .split(" ")
    .filter((token) => token && !TARIFA_NOISE_TOKENS.has(token))
}

function hasContradictoryTokens(tokensA: string[], tokensB: string[]): boolean {
  const setA = new Set(tokensA)
  const setB = new Set(tokensB)
  const aHasSin = setA.has("sin")
  const bHasSin = setB.has("sin")
  const aHasCon = setA.has("con")
  const bHasCon = setB.has("con")
  const aHasPerm = setA.has("permanencia")
  const bHasPerm = setB.has("permanencia")

  if (aHasSin && (bHasCon || bHasPerm)) return true
  if (bHasSin && (aHasCon || aHasPerm)) return true
  return false
}

/** Nombres equivalentes: +/con, mayúsculas, prefijos FIJA/FACIL ruido, sin mezclar sin/con. */
export function areMarcoTarifaNamesSimilar(a: string, b: string): boolean {
  const normA = normalizeMarcoTarifaName(a)
  const normB = normalizeMarcoTarifaName(b)
  if (!normA || !normB) return false
  if (normA === normB) return true

  const coreA = extractMarcoTarifaCoreTokens(a)
  const coreB = extractMarcoTarifaCoreTokens(b)
  if (hasContradictoryTokens(coreA, coreB)) return false

  const coreAStr = coreA.join(" ")
  const coreBStr = coreB.join(" ")
  if (coreAStr && coreAStr === coreBStr) return true

  const [shorter, longer] = coreA.length <= coreB.length ? [coreA, coreB] : [coreB, coreA]
  if (shorter.length < 2) return false

  const shorterInLonger = shorter.every((token) => longer.includes(token))
  if (!shorterInLonger) return false

  const extra = longer.filter((token) => !shorter.includes(token))
  return extra.length <= 2
}

export function buildMarcoDedupBusinessKey(row: {
  compania: string
  peaje: string
  segmento: string
  tipo: string
  comision_base: number
  comision_unidad: string
  comision_tipo: string
  condicion_2?: string | null
}): string {
  return [
    row.compania,
    row.peaje,
    row.segmento,
    row.tipo,
    row.comision_base,
    row.comision_unidad,
    row.comision_tipo,
    (row.condicion_2 ?? "").trim().toLowerCase(),
  ].join("|")
}

const GENERIC_TARIFA_PATTERNS = [
  /^comision\s+por\s+contrato$/i,
  /^comision\s+directa$/i,
  /^comision\s+unica$/i,
  /^comision\s+fija$/i,
  /^comision\s+variable$/i,
  /^comision$/i,
  /^referencia$/i,
]

/** Título genérico sin nombre comercial de tarifa (ej. COMISION POR CONTRATO). */
export function isMarcoGenericPlaceholderTariff(row: { tarifa: string }): boolean {
  const normalized = normalizeMarcoTarifaName(row.tarifa)
  if (!normalized) return true

  if (GENERIC_TARIFA_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true
  }

  if (/comision de referencia/.test(normalized)) return true

  return false
}

export function isMarcoReferenciaPlaceholder(row: {
  tarifa: string
  condicion_2?: string | null
}): boolean {
  return isMarcoGenericPlaceholderTariff(row)
}

export function marcoRowPriceScore(row: MarcoRetributivoRow): number {
  let score = 0
  const energyKeys = [
    row.energia_p1,
    row.energia_p2,
    row.energia_p3,
    row.energia_p4,
    row.energia_p5,
    row.energia_p6,
  ] as const
  const powerKeys = [
    row.potencia_p1,
    row.potencia_p2,
    row.potencia_p3,
    row.potencia_p4,
    row.potencia_p5,
    row.potencia_p6,
  ] as const
  for (const value of energyKeys) score += Number(value ?? 0)
  for (const value of powerKeys) score += Number(value ?? 0)
  return score
}

/** Conserva mayor comisión; empate → mayor precio; luego nombre más descriptivo. */
export function pickMarcoRowToKeep(rows: MarcoRetributivoRow[]): MarcoRetributivoRow {
  return [...rows].sort((a, b) => {
    const commDiff = Number(b.comision_base ?? 0) - Number(a.comision_base ?? 0)
    if (commDiff !== 0) return commDiff
    const priceDiff = marcoRowPriceScore(b) - marcoRowPriceScore(a)
    if (priceDiff !== 0) return priceDiff
    const lenDiff = b.tarifa.length - a.tarifa.length
    if (lenDiff !== 0) return lenDiff
    const createdDiff = (a.created_at ?? "").localeCompare(b.created_at ?? "")
    if (createdDiff !== 0) return createdDiff
    return a.id.localeCompare(b.id)
  })[0]!
}

function buildMarcoDedupScopeKey(row: MarcoRetributivoRow): string {
  return [row.compania, row.peaje, row.segmento, row.tipo].join("|")
}

export function findMarcoSimilarDuplicateGroups(
  rows: MarcoRetributivoRow[]
): MarcoRetributivoRow[][] {
  const active = rows.filter((row) => row.activo)
  const byScope = new Map<string, MarcoRetributivoRow[]>()

  for (const row of active) {
    const key = buildMarcoDedupScopeKey(row)
    const list = byScope.get(key) ?? []
    list.push(row)
    byScope.set(key, list)
  }

  const groups: MarcoRetributivoRow[][] = []

  for (const candidates of byScope.values()) {
    if (candidates.length < 2) continue

    const used = new Set<string>()
    for (let i = 0; i < candidates.length; i++) {
      const anchor = candidates[i]!
      if (used.has(anchor.id)) continue

      const cluster = [anchor]
      for (let j = i + 1; j < candidates.length; j++) {
        const other = candidates[j]!
        if (used.has(other.id)) continue
        const similarToCluster = cluster.some((member) =>
          areMarcoTarifaNamesSimilar(member.tarifa, other.tarifa)
        )
        if (similarToCluster) cluster.push(other)
      }

      if (cluster.length > 1) {
        for (const row of cluster) used.add(row.id)
        groups.push(cluster)
      }
    }
  }

  return groups
}

function marcoDisplayIdentityKey(row: MarcoRetributivoRow): string {
  return [
    normalizeMarcoTarifaName(row.compania),
    normalizeMarcoTarifaName(row.tarifa),
    String(row.peaje ?? "").trim().toLowerCase(),
    normalizeMarcoTarifaName(row.segmento),
    String(row.comision_base ?? ""),
    String(row.condicion_2 ?? "").trim().toLowerCase(),
  ].join("|")
}

/** Oculta duplicados de nombre/comisión en UI sin desactivar en BD. */
export function filterMarcoRowsForDisplay(rows: MarcoRetributivoRow[]): MarcoRetributivoRow[] {
  const deactivateIds = new Set(listMarcoRowsToDeactivate(rows).map((row) => row.id))
  const seen = new Set<string>()
  const out: MarcoRetributivoRow[] = []

  for (const row of rows) {
    if (deactivateIds.has(row.id)) continue
    const identity = marcoDisplayIdentityKey(row)
    if (seen.has(identity)) continue
    seen.add(identity)
    out.push(row)
  }

  return out
}

export function listMarcoRowsToDeactivate(rows: MarcoRetributivoRow[]): MarcoRetributivoRow[] {
  const toDeactivate: MarcoRetributivoRow[] = []

  for (const group of findMarcoSimilarDuplicateGroups(rows)) {
    const keep = pickMarcoRowToKeep(group)
    for (const row of group) {
      if (row.id !== keep.id) toDeactivate.push(row)
    }
  }

  for (const row of rows) {
    if (row.activo && isMarcoGenericPlaceholderTariff(row)) {
      toDeactivate.push(row)
    }
  }

  const seen = new Set<string>()
  return toDeactivate.filter((row) => {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    return true
  })
}
