export type MarcoLinkRow = {
  id: string
  at_marco_id: string | null
  at_rate_id: string | null
  tarifa: string
  compania: string
  tipo: string
}

function normalizeKey(value: string): string {
  return value
    .toUpperCase()
    .replace(/(\d)\s*\.\s*(\d)\s*TD/g, '$1.$2TD')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ')
}

export function resolveMarcoEntryId(
  marcos: MarcoLinkRow[],
  input: {
    atMarcoId: string | null
    atRateId: string | null
    tarifa: string
    compania: string
    tipo: string
  }
): string | null {
  if (input.atMarcoId) {
    const byMarco = marcos.find((row) => row.at_marco_id === input.atMarcoId)
    if (byMarco) return byMarco.id
  }
  if (input.atRateId) {
    const byRate = marcos.find((row) => row.at_rate_id === input.atRateId)
    if (byRate) return byRate.id
  }
  const tarifaKey = normalizeKey(input.tarifa)
  const companiaKey = input.compania.trim().toLowerCase()
  if (!tarifaKey || !companiaKey) return null
  const byMeta = marcos.find(
    (row) =>
      row.tipo === input.tipo &&
      normalizeKey(row.tarifa) === tarifaKey &&
      row.compania.trim().toLowerCase() === companiaKey
  )
  return byMeta?.id ?? null
}
