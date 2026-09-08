import {
  asNumber,
  asString,
  asUuid,
  fetchAllPages,
  fetchAtChildList,
  fetchAtRecord,
  getSupabaseAdmin,
  type JsonRecord,
} from './at-api.ts'
import {
  mapAtDocuments,
  mapAtEmails,
  mapAtEvents,
  mapAtNotes,
  mapAtPrices,
  resolveAtMarcoId,
  resolveAtPriceTariffId,
  resolveAtTariffId,
} from './at-contract-children.ts'
import { isAtPlaceholderCompania, resolveAtCompania, resolveAtTarifa } from './at-compania.ts'
import { releaseAtSyncLock, tryAcquireAtSyncLock } from './at-sync-lock.ts'
import { resolveAtSyncIds, type AtSyncContext } from './at-webhook-entity.ts'

const LOCK = 'contracts-at'
const UPSERT_BATCH = 50

const AT_STATUS_TO_ERP: Record<string, string> = {
  draft: 'Borrador',
  requested: 'PTE DE FIRMA',
  pending_sign: 'PTE DE FIRMA',
  pending_call: 'PTE DE FIRMA',
  verified: 'TRAMITANDO',
  sent: 'TRAMITANDO',
  signed: 'TRAMITANDO',
  in_review: 'TRAMITANDO',
  scoring: 'TRAMITANDO',
  active: 'ACTIVADO',
  incident: 'INCIDENCIA ADMINISTRATIVA',
  incident_resolved: 'INCIDENCIA ADMINISTRATIVA',
  error: 'INCIDENCIA ADMINISTRATIVA',
  ended: 'Dado de Baja',
  canceled: 'Dado de Baja',
  down: 'Dado de Baja',
  down_decommissioned: 'Dado de Baja',
}

function nested(row: JsonRecord, key: string): JsonRecord {
  const value = row[key]
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function pickCups(row: JsonRecord): string {
  const electricity = nested(row, 'electricity_data')
  const gas = nested(row, 'gas_data')
  return (
    asString(row.cups ?? row.CUPS) ||
    asString(electricity.cups ?? electricity.CUPS) ||
    asString(gas.cups ?? gas.CUPS) ||
    'SIN-CUPS'
  )
}

function pickTipo(row: JsonRecord): 'luz' | 'gas' {
  const tipo = asString(row.tipo ?? row.supply_type ?? row.tipo_suministro).toLowerCase()
  if (tipo.includes('gas')) return 'gas'
  if (nested(row, 'gas_data').cups || nested(row, 'gas_data').CUPS) return 'gas'
  return 'luz'
}

type AtPriceRows = ReturnType<typeof mapAtPrices>

function normalizeRateKey(value: string): string {
  return value
    .toUpperCase()
    .replace(/(\d)\s*\.\s*(\d)\s*TD/g, '$1.$2TD')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ')
}

async function fetchLocalTariffPrices(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  rateId: string
): Promise<AtPriceRows> {
  const { data: tariff } = await supabase
    .from('tariffs')
    .select('id')
    .eq('at_rate_id', rateId)
    .maybeSingle()
  if (!tariff?.id) return []
  const { data } = await supabase
    .from('tariff_prices')
    .select('period, energy_price_kwh, power_price_kw_day')
    .eq('tariff_id', tariff.id)
  return (data ?? []).map((row) => ({
    period: asString(row.period) || 'P1',
    energy: asNumber(row.energy_price_kwh),
    power: asNumber(row.power_price_kw_day),
  }))
}

async function findLocalRateIdByName(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  name: string | null,
  peaje: string | null
): Promise<string | null> {
  if (!name) return null
  const { data } = await supabase
    .from('tariffs')
    .select('at_rate_id, name, access_tariff')
    .not('at_rate_id', 'is', null)
  const key = normalizeRateKey(name)
  const rows = data ?? []
  const match =
    rows.find(
      (row) =>
        normalizeRateKey(asString(row.name)) === key &&
        (!peaje || asString(row.access_tariff) === peaje)
    ) ?? rows.find((row) => normalizeRateKey(asString(row.name)) === key)
  return asUuid(match?.at_rate_id)
}

async function resolveContractPriceSources(rows: JsonRecord[], supabase: ReturnType<typeof getSupabaseAdmin>) {
  const rateByMarco = new Map<string, string>()
  const uniqueRateIds = new Set<string>()

  for (const row of rows) {
    let rateId = resolveAtTariffId(row)
    if (!rateId) {
      const marcoId = resolveAtMarcoId(row)
      if (marcoId) {
        rateId = rateByMarco.get(marcoId) ?? (await resolveAtPriceTariffId(row))
        if (rateId) rateByMarco.set(marcoId, rateId)
      }
    }
    if (!rateId) {
      const electricity = nested(row, 'electricity_data')
      rateId = await findLocalRateIdByName(
        supabase,
        asString(electricity.rate_name ?? electricity.tariff_name),
        asString(electricity.access_tariff)
      )
      const marcoId = resolveAtMarcoId(row)
      if (rateId && marcoId) rateByMarco.set(marcoId, rateId)
    }
    if (rateId) uniqueRateIds.add(rateId)
  }

  const pricesByTariff = new Map<string, AtPriceRows>()
  for (const tariffId of uniqueRateIds) {
    try {
      const tariff = await fetchAtRecord(`/tariffs/${tariffId}`)
      let mapped = mapAtPrices(tariff)
      if (mapped.length === 0) mapped = await fetchLocalTariffPrices(supabase, tariffId)
      if (mapped.length > 0) pricesByTariff.set(tariffId, mapped)
    } catch (error) {
      console.warn('[sync-contracts] tariff prices failed', tariffId, error)
      const local = await fetchLocalTariffPrices(supabase, tariffId)
      if (local.length > 0) pricesByTariff.set(tariffId, local)
    }
  }

  return { pricesByTariff, rateByMarco }
}

function clientName(row: JsonRecord): string {
  const business = asString(row.business_name ?? row.razon_social)
  if (business) return business
  const joined = [asString(row.first_name ?? row.nombre), asString(row.last_name ?? row.apellidos)]
    .filter(Boolean)
    .join(' ')
  return joined || asString(row.client_name) || 'Cliente AT'
}


export async function runContractSync(ctx?: AtSyncContext) {
  const ids = resolveAtSyncIds(ctx, ctx?.event ?? '')
  const incrementalId = ids.contractId
  const isDelete = (ctx?.event ?? '').startsWith('contract.deleted')
  const supabase = getSupabaseAdmin()
  const lockName = incrementalId ? `${LOCK}:${incrementalId}` : LOCK
  const acquired = await tryAcquireAtSyncLock(supabase, lockName)
  if (!acquired) {
    return { skipped: true, skip_reason: 'lock_held', stats: { skipped: true } }
  }

  try {
    const syncedAt = new Date().toISOString()

    if (isDelete && incrementalId) {
      const { data, error } = await supabase
        .from('contratos_equipo')
        .update({ estado: 'Dado de Baja', at_status: 'deleted', at_synced_at: syncedAt })
        .eq('at_contract_id', incrementalId)
        .eq('source', 'at')
        .select('id')
      if (error) throw new Error(`contratos delete failed: ${error.message}`)
      return {
        stats: {
          mode: 'incremental',
          deleted: data?.length ?? 0,
          at_contract_id: incrementalId,
        },
      }
    }

    let rows: JsonRecord[] = []
    let pagesFetched = 0
    let notes: JsonRecord[] | null = null
    let events: JsonRecord[] | null = null
    let documents: JsonRecord[] | null = null
    let emails: JsonRecord[] | null = null

    if (incrementalId) {
      const record = await fetchAtRecord(`/contracts/${incrementalId}`)
      if (!record) {
        return { stats: { mode: 'incremental', missing: true, at_contract_id: incrementalId } }
      }
      rows = [record]
      ;[notes, events, documents, emails] = await Promise.all([
        fetchAtChildList(`/contracts/${incrementalId}/notes`),
        fetchAtChildList(`/contracts/${incrementalId}/events`),
        fetchAtChildList(`/contracts/${incrementalId}/documents`),
        fetchAtChildList(`/contracts/${incrementalId}/emails`),
      ])
    } else {
      const listed = await fetchAllPages('/contracts')
      rows = listed.rows
      pagesFetched = listed.pagesFetched
    }

    const { pricesByTariff, rateByMarco } = await resolveContractPriceSources(rows, supabase)

    const { data: clients } = await supabase
      .from('clientes')
      .select('id, at_client_id')
      .not('at_client_id', 'is', null)
    const clientByAt = new Map(
      (clients ?? []).map((row) => [String(row.at_client_id), String(row.id)])
    )

    const { data: tariffs } = await supabase
      .from('tariffs')
      .select('id, at_rate_id, name')
      .not('at_rate_id', 'is', null)
    const tariffByAt = new Map(
      (tariffs ?? []).map((row) => [
        String(row.at_rate_id),
        { id: String(row.id), name: asString(row.name) },
      ])
    )

    const { data: marcos } = await supabase
      .from('marco_retributivo')
      .select('id, at_marco_id')
      .not('at_marco_id', 'is', null)
    const marcoByAt = new Map(
      (marcos ?? []).map((row) => [String(row.at_marco_id), String(row.id)])
    )

    const { data: providers } = await supabase
      .from('providers')
      .select('name, at_company_id')
      .not('at_company_id', 'is', null)
    const providerByAt = new Map(
      (providers ?? []).map((row) => [String(row.at_company_id), asString(row.name)])
    )

    const mapped = []
    for (const row of rows) {
      const atId = asUuid(row.id)
      if (!atId) continue
      const atClientId = asUuid(row.cliente_id ?? row.client_id)
      const marcoId = asUuid(row.marco_id) ?? asString(row.marco_logical_id)
      const rateId = resolveAtTariffId(row) ?? (marcoId ? rateByMarco.get(marcoId) ?? null : null)
      const activationDate = (asString(row.activation_date ?? row.fecha_activacion) || '').slice(0, 10) || null
      const linkedTariff = rateId ? tariffByAt.get(rateId) : undefined
      const atStatus = asString(row.status ?? row.estado).toLowerCase()
      const companiaResolved = resolveAtCompania(row, providerByAt)
      const tarifaResolved = resolveAtTarifa(row, linkedTariff?.name ?? '')
      const contractPrices = rateId ? pricesByTariff.get(rateId) : undefined
      mapped.push({
        at_contract_id: atId,
        cliente_id: atClientId ? clientByAt.get(atClientId) ?? null : null,
        client_name: clientName(row),
        cups: pickCups(row),
        tipo: pickTipo(row),
        compania: companiaResolved || 'Sin compañía',
        tarifa: tarifaResolved,
        tipo_precio: asString(row.tipo_precio) || null,
        consumo_anual: asNumber(row.consumo_anual) ?? 0,
        estado: AT_STATUS_TO_ERP[atStatus] ?? 'PTE DE TRAMITACIÓN',
        at_status: atStatus || null,
        comercial_id: null,
        comercial_name: asString(row.comercial_name ?? row.responsible_name) || null,
        nif: asString(row.nif ?? row.dni_cif) || null,
        telefono: asString(row.phone ?? row.telefono) || null,
        email: asString(row.email) || null,
        iban: asString(row.iban) || null,
        direccion_suministro: asString(row.address_street ?? row.direccion_suministro) || null,
        direccion_fiscal: asString(row.direccion_fiscal) || null,
        codigo_postal: asString(row.address_postal_code ?? row.codigo_postal) || null,
        poblacion: asString(row.address_city ?? row.poblacion) || null,
        provincia: asString(row.address_province ?? row.provincia) || null,
        potencia_contratada: asString(row.potencia_contratada) || null,
        fecha_inicio: (asString(row.created_at ?? row.contract_date ?? row.fecha_inicio) || syncedAt).slice(0, 10),
        estado_efectivo_desde: activationDate,
        tipo_cliente: asString(row.tipo_cliente) || null,
        marco_entry_id: marcoId ? marcoByAt.get(marcoId) ?? null : null,
        at_rate_id: rateId,
        tariff_id: linkedTariff?.id ?? null,
        at_marco_id: marcoId || null,
        at_comparison_id: asUuid(row.comparision_id ?? row.comparison_id),
        source: 'at',
        at_synced_at: syncedAt,
        at_status_note: asString(row.status_note ?? row.incident_reason) || null,
        at_incident_at: asString(row.incident_at) || null,
        ...(notes ? { at_notes: mapAtNotes(notes) } : {}),
        ...(events ? { at_events: mapAtEvents(events) } : {}),
        ...(documents ? { at_documents: mapAtDocuments(documents) } : {}),
        ...(emails ? { at_emails: mapAtEmails(emails) } : {}),
        ...(contractPrices && contractPrices.length > 0 ? { at_prices: contractPrices } : {}),
        at_payload: row,
        metadata: {
          at: true,
          electricity_data: row.electricity_data ?? null,
          gas_data: row.gas_data ?? null,
          svas: row.svas ?? null,
        },
      })
    }

    let upserted = 0
    for (let offset = 0; offset < mapped.length; offset += UPSERT_BATCH) {
      const batch = mapped.slice(offset, offset + UPSERT_BATCH)
      const { error } = await supabase.from('contratos_equipo').upsert(batch, {
        onConflict: 'at_contract_id',
      })
      if (error) throw new Error(`contratos_equipo upsert failed: ${error.message}`)
      upserted += batch.length
    }

    const seen = new Set(mapped.map((row) => row.at_contract_id))
    let deactivated = 0
    if (!incrementalId && seen.size > 0) {
      const { data, error } = await supabase
        .from('contratos_equipo')
        .update({ estado: 'Dado de Baja', at_synced_at: syncedAt })
        .eq('source', 'at')
        .neq('estado', 'Dado de Baja')
        .lt('at_synced_at', syncedAt)
        .select('id')
      if (error) throw new Error(`contratos deactivate failed: ${error.message}`)
      deactivated = data?.length ?? 0
    }

    return {
      stats: {
        mode: incrementalId ? 'incremental' : 'full',
        at_contract_id: incrementalId,
        notes_synced: notes?.length ?? null,
        events_synced: events?.length ?? null,
        documents_synced: documents?.length ?? null,
        emails_synced: emails?.length ?? null,
        tariffs_priced: pricesByTariff.size,
        prices_synced: mapped.filter((row) => Array.isArray(row.at_prices) && row.at_prices.length > 0).length,
        pages_fetched: pagesFetched,
        rows_from_at: rows.length,
        rows_mapped: mapped.length,
        upserted,
        deactivated,
        clients_linked: mapped.filter((row) => row.cliente_id).length,
        tariffs_linked: mapped.filter((row) => row.tariff_id).length,
      },
    }
  } finally {
    await releaseAtSyncLock(supabase, LOCK)
  }
}
