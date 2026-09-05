export type AtWebhookIds = {
  contractId: string | null
  incidentId: string | null
}

export type AtSyncContext = {
  event?: string
  body?: Record<string, unknown>
  contractId?: string | null
  incidentId?: string | null
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function asUuid(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return UUID_RE.test(text) ? text.toLowerCase() : null
}

function recordOf(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function pickUuid(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const found = asUuid(record[key])
    if (found) return found
  }
  return null
}

function collectRecords(body: Record<string, unknown> | undefined): Record<string, unknown>[] {
  if (!body) return []
  const nested = [body, body.data, body.payload, body.record, body.object, body.entity]
    .map(recordOf)
    .filter((item): item is Record<string, unknown> => item != null)
  const dataRecord = recordOf(body.data)
  if (dataRecord) {
    nested.push(
      ...[dataRecord.data, dataRecord.payload, dataRecord.record]
        .map(recordOf)
        .filter((item): item is Record<string, unknown> => item != null)
    )
  }
  return nested
}

export function extractAtWebhookIds(
  event: string,
  body?: Record<string, unknown>
): AtWebhookIds {
  const records = collectRecords(body)
  let contractId: string | null = null
  let incidentId: string | null = null

  for (const record of records) {
    contractId ??= pickUuid(record, ['contract_id', 'contrato_id', 'at_contract_id'])
    incidentId ??= pickUuid(record, ['incident_id', 'incidencia_id', 'at_incident_id'])
  }

  const topId = records.map((record) => asUuid(record.id)).find(Boolean) ?? null
  const isContractIncident = event.startsWith('contract_incident.')
  const isIncident = event.startsWith('incident.') || isContractIncident
  const isContract = event.startsWith('contract.') && !isContractIncident

  if (topId && isIncident) incidentId ??= topId
  if (topId && isContract) contractId ??= topId

  return { contractId, incidentId }
}

export function resolveAtSyncIds(
  ctx: AtSyncContext | undefined,
  fallbackEvent = ''
): AtWebhookIds {
  const event = ctx?.event || fallbackEvent
  const fromBody = extractAtWebhookIds(event, ctx?.body)
  return {
    contractId: ctx?.contractId ?? fromBody.contractId,
    incidentId: ctx?.incidentId ?? fromBody.incidentId,
  }
}
