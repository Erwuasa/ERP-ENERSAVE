export type MarcoLinkRow = {
  id: string
  at_marco_id: string | null
  at_rate_id: string | null
  tarifa: string
  compania: string
  tipo: string
}

function normalizeCompany(value: string): string {
  return value.trim().toLowerCase()
}

export function tarifaCore(value: string): string {
  return value
    .toUpperCase()
    .replace(/(\d)\s*\.\s*(\d)\s*TD/g, '$1.$2TD')
    .replace(/^\d+\.\d+TD\s+/, '')
    .replace(/^(RL\d+|R\d+)\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function sameCompany(left: string, right: string): boolean {
  const a = normalizeCompany(left)
  const b = normalizeCompany(right)
  if (!a || !b) return false
  return a === b
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
    const byMarcoAsRate = marcos.find((row) => row.at_rate_id === input.atMarcoId)
    if (byMarcoAsRate) return byMarcoAsRate.id
  }
  if (input.atRateId) {
    const byRate = marcos.find((row) => row.at_rate_id === input.atRateId)
    if (byRate) return byRate.id
  }

  const core = tarifaCore(input.tarifa)
  if (!core) return null

  const typed = marcos.filter((row) => row.tipo === input.tipo)
  const sameName = typed.filter((row) => tarifaCore(row.tarifa) === core)
  const withCompany = sameName.filter((row) => sameCompany(row.compania, input.compania))
  if (withCompany.length === 1) return withCompany[0].id
  if (withCompany.length > 1) return withCompany[0].id
  if (!input.compania.trim() && sameName.length === 1) return sameName[0].id
  return null
}
