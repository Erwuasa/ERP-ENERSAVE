import { asString, asUuid, type JsonRecord } from './at-api.ts'

function nested(row: JsonRecord, key: string): JsonRecord {
  const value = row[key]
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

export function isAtPlaceholderCompania(value: string | null | undefined): boolean {
  const trimmed = (value ?? '').trim()
  if (!trimmed || trimmed === '—') return true
  return trimmed.toUpperCase() === 'AT'
}

export function resolveAtCompania(row: JsonRecord, providerByAt: Map<string, string>): string {
  const contract = nested(row, 'contract')
  const provider = nested(row, 'provider')

  const candidates = [
    asString(row.compania),
    asString(row.company),
    asString(row.provider_name),
    asString(row.compania_nombre),
    asString(row.proveedor_nombre),
    asString(row.billing_company_name),
    asString(row.company_name),
    asString(contract.compania),
    asString(contract.company),
    asString(contract.provider_name),
    asString(provider.nombre),
    asString(provider.name),
  ]

  for (const candidate of candidates) {
    if (candidate && !isAtPlaceholderCompania(candidate)) return candidate.trim()
  }

  const providerAtId =
    asUuid(row.provider_id) ??
    asUuid(contract.provider_id) ??
    asUuid(provider.id)
  if (providerAtId) {
    const fromProvider = providerByAt.get(providerAtId)
    if (fromProvider && !isAtPlaceholderCompania(fromProvider)) return fromProvider.trim()
  }

  return ''
}

export function resolveAtTarifa(row: JsonRecord, linkedTariffName = ''): string {
  const contract = nested(row, 'contract')
  const electricity = nested(row, 'electricity_data')
  const gas = nested(row, 'gas_data')
  const contractElectricity = nested(contract, 'electricity_data')
  const contractGas = nested(contract, 'gas_data')

  const candidates = [
    asString(row.tarifa),
    asString(row.rate_name),
    asString(row.tariff_name),
    asString(contract.tarifa),
    asString(contract.rate_name),
    asString(contract.tariff_name),
    asString(electricity.rate_name),
    asString(electricity.tariff_name),
    asString(gas.rate_name),
    asString(gas.tariff_name),
    asString(contractElectricity.rate_name),
    asString(contractElectricity.tariff_name),
    asString(contractGas.rate_name),
    asString(contractGas.tariff_name),
    linkedTariffName,
  ]

  for (const candidate of candidates) {
    const trimmed = candidate?.trim() ?? ''
    if (!trimmed) continue
    if (trimmed.toUpperCase() === 'TARIFA AT') continue
    return trimmed
  }

  return linkedTariffName.trim() || '—'
}
