import { asNumber, asString, asUuid, fetchAtRecord, type JsonRecord } from './at-api.ts'

function nestedRecord(row: JsonRecord, key: string): JsonRecord {
  const value = row[key]
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

export function resolveAtMarcoId(record: JsonRecord | null): string | null {
  if (!record) return null
  return asUuid(record.marco_id) ?? asUuid(nestedRecord(record, 'electricity_data').tariff_id)
}

export function resolveAtTariffId(record: JsonRecord | null): string | null {
  if (!record) return null
  const electricity = nestedRecord(record, 'electricity_data')
  const gas = nestedRecord(record, 'gas_data')
  const marcoId = asUuid(record.marco_id)
  const explicit = asUuid(
    record.rates_id ?? record.rate_id ?? electricity.rate_id ?? electricity.rates_id ?? gas.rate_id
  )
  if (explicit) return explicit
  const maybeTariff = asUuid(record.tariff_id ?? electricity.tariff_id ?? gas.tariff_id)
  if (maybeTariff && maybeTariff !== marcoId) return maybeTariff
  return null
}

export async function resolveAtPriceTariffId(record: JsonRecord | null): Promise<string | null> {
  const rateId = resolveAtTariffId(record)
  if (rateId) return rateId
  const marcoId = resolveAtMarcoId(record)
  if (!marcoId) return null
  const marco = await fetchAtRecord(`/marcos/${marcoId}`)
  if (!marco) return null
  const nestedRate = nestedRecord(marco, 'rate')
  return asUuid(marco.rate_id ?? marco.rates_id ?? marco.tariff_id ?? nestedRate.id)
}

function pickString(row: JsonRecord, keys: string[]): string {
  for (const key of keys) {
    const value = asString(row[key])
    if (value) return value
  }
  return ''
}

export function mapAtNotes(rows: JsonRecord[]) {
  return rows.map((row) => ({
    id: asString(row.id) || null,
    note: asString(row.note ?? row.text ?? row.body),
    is_private: row.is_private === true,
    created_at: asString(row.created_at ?? row.createdAt) || null,
    created_by: asString(row.created_by ?? row.createdBy) || null,
    author_side: asString(row.author_side ?? row.authorSide) || null,
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : null,
  }))
}

export function mapAtEvents(rows: JsonRecord[]) {
  return rows.map((row) => ({
    id: asString(row.id) || null,
    type: pickString(row, ['type', 'event', 'kind', 'action', 'name']),
    title: pickString(row, ['title', 'summary', 'message', 'description', 'label']),
    from_status: pickString(row, ['from', 'from_status', 'old_status', 'status_from', 'previous_status']),
    to_status: pickString(row, ['to', 'to_status', 'new_status', 'status_to']),
    actor: pickString(row, ['actor', 'actor_name', 'user', 'user_name', 'created_by', 'author', 'author_name']),
    created_at: pickString(row, ['created_at', 'createdAt', 'occurred_at', 'timestamp']),
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : null,
  }))
}

export function mapAtDocuments(rows: JsonRecord[]) {
  return rows.map((row) => ({
    id: asString(row.id) || null,
    name: pickString(row, ['name', 'filename', 'file_name', 'title', 'original_name']),
    type: pickString(row, ['type', 'kind', 'category', 'document_type']),
    url: pickString(row, ['url', 'signed_url', 'download_url', 'file_url', 'public_url']),
    size: pickString(row, ['size', 'file_size', 'bytes']),
    mime: pickString(row, ['mime', 'mime_type', 'content_type']),
    created_at: pickString(row, ['created_at', 'createdAt', 'uploaded_at']),
  }))
}

export function mapAtPrices(record: JsonRecord | null) {
  if (!record) return []

  const sources = [
    record,
    nestedRecord(record, 'electricity_data'),
    nestedRecord(record, 'gas_data'),
    nestedRecord(record, 'pricing'),
    nestedRecord(record, 'prices'),
  ]
  const out: Array<{ period: string; energy: number | null; power: number | null }> = []

  for (let i = 1; i <= 6; i++) {
    let energy: number | null = null
    let power: number | null = null
    for (const source of sources) {
      energy ??= asNumber(source[`price_kwh_p${i}`] ?? source[`energia_p${i}`] ?? source[`energy_p${i}`])
      power ??= asNumber(source[`price_kw_day_p${i}`] ?? source[`potencia_p${i}`] ?? source[`power_p${i}`])
    }
    if (energy == null && power == null) continue
    out.push({ period: `P${i}`, energy, power })
  }

  const list = record.prices ?? record.tariff_prices ?? record.period_prices
  if (out.length === 0 && Array.isArray(list)) {
    for (const item of list) {
      if (!item || typeof item !== 'object') continue
      const row = item as JsonRecord
      const period = asString(row.period ?? row.periodo ?? row.name) || `P${out.length + 1}`
      out.push({
        period: period.toUpperCase().startsWith('P') ? period.toUpperCase() : `P${period}`,
        energy: asNumber(row.energy_price_kwh ?? row.energy ?? row.energia),
        power: asNumber(row.power_price_kw_day ?? row.power ?? row.potencia),
      })
    }
  }

  return out
}

export function mapAtEmails(rows: JsonRecord[]) {
  return rows.map((row) => ({
    id: asString(row.id) || null,
    subject: pickString(row, ['subject', 'title', 'asunto']),
    to: pickString(row, ['to', 'recipient', 'email', 'to_email']),
    status: pickString(row, ['status', 'delivery_status', 'state']),
    created_at: pickString(row, ['created_at', 'createdAt', 'sent_at']),
  }))
}
