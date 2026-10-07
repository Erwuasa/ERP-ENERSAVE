// Pure change detection between what Enertech returned and what we already mirror.

export interface IncomingRow {
  key: string
  /** `actualizado_en` as the API gave it (naive string), or null when the entity has none. */
  actualizadoEn: string | null
  hash: string
}

export interface ExistingRow {
  key: string
  actualizadoEn: string | null
  hash: string | null
  /** Non-null when a previous run marked the row as gone. */
  removedAt: string | null
}

export interface RowClassification {
  created: IncomingRow[]
  /** Content changed: `actualizado_en` moved or the payload hash differs. */
  updated: IncomingRow[]
  /** Was marked removed and is back in the feed. */
  restored: IncomingRow[]
  unchanged: IncomingRow[]
  removedKeys: string[]
}

const MIN_ROWS_FOR_RATIO_GUARD = 10
const MIN_KEPT_RATIO = 0.5

/**
 * A row counts as changed when `actualizado_en` differs OR the whole payload hash differs.
 * The hash makes the mirror exact even if the API forgets to bump `actualizado_en`.
 */
export function hasRowChanged(incoming: IncomingRow, existing: ExistingRow): boolean {
  if (incoming.actualizadoEn !== null && incoming.actualizadoEn !== existing.actualizadoEn) return true
  return incoming.hash !== existing.hash
}

/** Refuses to mass-remove rows after a suspiciously small answer (outage, empty page, wrong filter). */
export function shouldApplyRemovals(incomingCount: number, existingActiveCount: number): boolean {
  if (existingActiveCount === 0) return true
  if (incomingCount === 0) return false
  if (existingActiveCount >= MIN_ROWS_FOR_RATIO_GUARD && incomingCount < existingActiveCount * MIN_KEPT_RATIO) {
    return false
  }
  return true
}

export function classifyRows(
  incoming: IncomingRow[],
  existing: ExistingRow[],
  options: { removeMissing: boolean }
): RowClassification {
  const existingByKey = new Map(existing.map((row) => [row.key, row]))
  const seen = new Set<string>()
  const result: RowClassification = { created: [], updated: [], restored: [], unchanged: [], removedKeys: [] }

  for (const row of incoming) {
    if (seen.has(row.key)) continue
    seen.add(row.key)

    const previous = existingByKey.get(row.key)
    if (!previous) result.created.push(row)
    else if (previous.removedAt !== null) result.restored.push(row)
    else if (hasRowChanged(row, previous)) result.updated.push(row)
    else result.unchanged.push(row)
  }

  if (options.removeMissing) {
    const active = existing.filter((row) => row.removedAt === null)
    if (shouldApplyRemovals(seen.size, active.length)) {
      result.removedKeys = active.filter((row) => !seen.has(row.key)).map((row) => row.key)
    }
  }

  return result
}
