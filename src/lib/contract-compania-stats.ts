export interface CompaniaContractRow {
  comercialId: string
  compania: string
  createdAt: string
}

export interface CompaniaCount {
  compania: string
  count: number
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function inDateRange(dateIso: string, dateFrom: string, dateTo: string): boolean {
  const t = parseIsoDate(dateIso).getTime()
  const from = parseIsoDate(dateFrom).getTime()
  const to = parseIsoDate(dateTo).getTime()
  return t >= from && t <= to
}

/** Cuenta contratos por compañía en un rango de fechas (eje X = orden de primera alta). */
export function countContractsByCompaniaInRange(
  contracts: CompaniaContractRow[],
  comercialId: string,
  dateFrom: string,
  dateTo: string
): CompaniaCount[] {
  if (!dateFrom || !dateTo || dateFrom > dateTo) return []

  const inRange = contracts
    .filter(
      (c) =>
        c.comercialId === comercialId && inDateRange(c.createdAt, dateFrom, dateTo)
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.compania.localeCompare(b.compania, "es"))

  const tallies = new Map<string, number>()
  const order: string[] = []

  for (const c of inRange) {
    const key = c.compania.trim() || "Sin compañía"
    if (!tallies.has(key)) order.push(key)
    tallies.set(key, (tallies.get(key) ?? 0) + 1)
  }

  return order.map((compania) => ({
    compania,
    count: tallies.get(compania) ?? 0,
  }))
}

export function defaultCompaniaDateRange(reference = new Date()): {
  dateFrom: string
  dateTo: string
} {
  const dateTo = reference.toISOString().slice(0, 10)
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1)
  const dateFrom = start.toISOString().slice(0, 10)
  return { dateFrom, dateTo }
}
