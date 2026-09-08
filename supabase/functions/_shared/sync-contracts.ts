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
import { resolveAtCompania, resolveAtTarifa } from './at-compania.ts'
import { releaseAtSyncLock, tryAcquireAtSyncLock } from './at-sync-lock.ts'
import { resolveAtSyncIds, type AtSyncContext } from './at-webhook-entity.ts'
import { omitErpOwnedContractFields, omitOverriddenFields, parseManualOverrides } from './manual-overrides.ts'
import { resolveMarcoEntryId, type MarcoLinkRow } from './marco-link.ts'
import { ensureMarcoSettlements } from './sync-marco-settlements.ts'
import { upsertMarcosFromAtIds } from './sync-marcos.ts'

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

function formatPowersForDb(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const parts = Object.entries(raw as Record<string, unknown>)
    .map(([key, value]) => {
      const periodo = /(\d+)/.exec(key)?.[1]
      const kw = asNumber(value)
      if (!periodo || kw == null) return null
      return { periodo: Number(periodo), kw }
    })
    .filter((row): row is { periodo: number; kw: number } => row != null)
    .sort((left, right) => left.periodo - right.periodo)
    .map((row) => `P${row.periodo}: ${row.kw}`)
  return parts.length > 0 ? parts.join(' · ') : null
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
        .not('manual_overrides', 'cs', '{"estado":true}')
        .select('id')
      if (error) throw new Error(`contratos delete failed: ${error.message}`)
      const deletedIds = (data ?? []).map((row) => String(row.id))
      const settlementStats = await ensureMarcoSettlements(supabase, deletedIds)
      return {
        stats: {
          mode: 'incremental',
          deleted: deletedIds.length,
          at_contract_id: incrementalId,
          settlements: settlementStats,
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
      const electricity = nested(row, 'electricity_data')
      const gas = nested(row, 'gas_data')
      const linkedTariff = rateId ? tariffByAt.get(rateId) : undefined
      const atStatus = asString(row.status ?? row.estado).toLowerCase()
      const companiaResolved = resolveAtCompania(row, providerByAt)
      const tarifaResolved = resolveAtTarifa(row, linkedTariff?.name ?? '')
      const contractPrices = rateId ? pricesByTariff.get(rateId) : undefined
      const p1Energy = contractPrices?.find((item) => item.period === 'P1')?.energy
      mapped.push({
        at_contract_id: atId,
        cliente_id: atClientId ? clientByAt.get(atClientId) ?? null : null,
        client_name: clientName(row),
        cups: pickCups(row),
        tipo: pickTipo(row),
        compania: companiaResolved || '',
        tarifa: tarifaResolved,
        tipo_precio: asString(row.tipo_precio) || null,
        consumo_anual:
          asNumber(row.consumo_anual) ??
          asNumber(electricity.consumo_anual_kwh) ??
          asNumber(gas.consumo_anual_kwh) ??
          0,
        estado: AT_STATUS_TO_ERP[atStatus] ?? 'PTE DE TRAMITACIÓN',
        at_status: atStatus || null,
        comercial_name: asString(row.comercial_name ?? row.responsible_name) || '',
        nif: asString(row.nif ?? row.dni_cif) || null,
        telefono: asString(row.phone ?? row.telefono) || null,
        email: asString(row.email) || null,
        iban: asString(row.iban) || null,
        direccion_suministro: asString(row.address_street ?? row.direccion_suministro) || null,
        direccion_fiscal: asString(row.direccion_fiscal) || null,
        codigo_postal: asString(row.address_postal_code ?? row.codigo_postal) || null,
        poblacion: asString(row.address_city ?? row.poblacion) || null,
        provincia: asString(row.address_province ?? row.provincia) || null,
        potencia_contratada:
          asString(row.potencia_contratada) ||
          formatPowersForDb(electricity.powers ?? gas.powers),
        precio_fijo_consumo: asNumber(row.precio_fijo_consumo) ?? p1Energy ?? null,
        fecha_inicio: (asString(row.created_at ?? row.contract_date ?? row.fecha_inicio) || syncedAt).slice(0, 10),
        estado_efectivo_desde: activationDate,
        tipo_cliente: asString(row.tipo_cliente) || null,
        marco_entry_id: null as string | null,
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
        at_prices: contractPrices && contractPrices.length > 0 ? contractPrices : [],
        at_payload: row,
        metadata: {
          at: true,
          atr:
            asString(electricity.access_tariff ?? gas.access_tariff ?? row.access_tariff) || null,
          address_line_2:
            asString(row.address_line_2 ?? row.address_line2 ?? electricity.address_line_2) || null,
          is_new_supply: row.is_new_supply === true || electricity.is_new_supply === true,
          is_ownership_change:
            row.is_ownership_change === true || electricity.is_ownership_change === true,
          svas: row.svas ?? null,
          powers: electricity.powers ?? gas.powers ?? null,
          rate_name:
            asString(electricity.rate_name ?? electricity.tariff_name ?? gas.rate_name) || null,
          signed_at: asString(row.signed_at ?? row.signedAt) || null,
          created_at_at: asString(row.created_at) || null,
          updated_at_at: asString(row.updated_at) || null,
        },
      })
    }

    async function loadMarcoRows(): Promise<MarcoLinkRow[]> {
      const { data } = await supabase
        .from('marco_retributivo')
        .select('id, at_marco_id, at_rate_id, tarifa, compania, tipo')
      return (data ?? []).map((row) => ({
        id: String(row.id),
        at_marco_id: asUuid(row.at_marco_id) ?? (asString(row.at_marco_id) || null),
        at_rate_id: asUuid(row.at_rate_id) ?? (asString(row.at_rate_id) || null),
        tarifa: asString(row.tarifa),
        compania: asString(row.compania),
        tipo: asString(row.tipo),
      }))
    }

    function assignMarcoEntryIds(catalog: MarcoLinkRow[]) {
      for (const row of mapped) {
        row.marco_entry_id = resolveMarcoEntryId(catalog, {
          atMarcoId: row.at_marco_id,
          atRateId: row.at_rate_id,
          tarifa: row.tarifa,
          compania: row.compania,
          tipo: row.tipo,
        })
      }
    }

    let marcoRows = await loadMarcoRows()
    assignMarcoEntryIds(marcoRows)

    const missingMarcoIds = [
      ...new Set(
        mapped
          .filter((row) => !row.marco_entry_id && row.at_marco_id)
          .map((row) => row.at_marco_id as string)
      ),
    ]
    const importedMarcos = await upsertMarcosFromAtIds(missingMarcoIds)
    if (importedMarcos.upserted > 0) {
      marcoRows = await loadMarcoRows()
      assignMarcoEntryIds(marcoRows)
    }

    const atIds = mapped.map((row) => row.at_contract_id)
    const existingByAt = new Map<
      string,
      {
        id: string
        comercial_id: string | null
        comercial_name: string | null
        marco_entry_id: string | null
        manual_overrides: unknown
      }
    >()
    if (atIds.length > 0) {
      const { data: existingRows, error: existingError } = await supabase
        .from('contratos_equipo')
        .select('id, at_contract_id, comercial_id, comercial_name, marco_entry_id, manual_overrides')
        .in('at_contract_id', atIds)
      if (existingError) throw new Error(`contratos existing lookup failed: ${existingError.message}`)
      for (const row of existingRows ?? []) {
        const atId = asUuid(row.at_contract_id)
        if (!atId) continue
        existingByAt.set(atId, {
          id: String(row.id),
          comercial_id: asUuid(row.comercial_id),
          comercial_name: asString(row.comercial_name) || null,
          marco_entry_id: asUuid(row.marco_entry_id) ?? (asString(row.marco_entry_id) || null),
          manual_overrides: row.manual_overrides,
        })
      }
    }

    const toUpsert = mapped.map((row) => {
      const existing = existingByAt.get(row.at_contract_id)
      let next = omitErpOwnedContractFields(
        omitOverriddenFields(
          row as Record<string, unknown>,
          parseManualOverrides(existing?.manual_overrides)
        )
      )
      if (existing?.marco_entry_id) {
        delete next.marco_entry_id
      }
      if (existing?.comercial_id) {
        delete next.comercial_name
      }
      return next
    })

    let upserted = 0
    for (let offset = 0; offset < toUpsert.length; offset += UPSERT_BATCH) {
      const batch = toUpsert.slice(offset, offset + UPSERT_BATCH)
      const { error } = await supabase.from('contratos_equipo').upsert(batch, {
        onConflict: 'at_contract_id',
      })
      if (error) throw new Error(`contratos_equipo upsert failed: ${error.message}`)
      upserted += batch.length
    }

    const seen = new Set(mapped.map((row) => row.at_contract_id))
    let deactivated = 0
    const deactivatedIds: string[] = []
    if (!incrementalId && seen.size > 0) {
      const { data, error } = await supabase
        .from('contratos_equipo')
        .update({ estado: 'Dado de Baja', at_synced_at: syncedAt })
        .eq('source', 'at')
        .neq('estado', 'Dado de Baja')
        .lt('at_synced_at', syncedAt)
        .not('manual_overrides', 'cs', '{"estado":true}')
        .select('id')
      if (error) throw new Error(`contratos deactivate failed: ${error.message}`)
      deactivated = data?.length ?? 0
      for (const row of data ?? []) deactivatedIds.push(String(row.id))
    }

    const syncedIds = [...existingByAt.values()].map((row) => row.id)
    if (atIds.length > 0) {
      const { data: persisted } = await supabase
        .from('contratos_equipo')
        .select('id')
        .in('at_contract_id', atIds)
      for (const row of persisted ?? []) syncedIds.push(String(row.id))
    }

    const settlementStats = await ensureMarcoSettlements(supabase, [
      ...new Set([...syncedIds, ...deactivatedIds]),
    ])

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
        marcos_linked: mapped.filter((row) => row.marco_entry_id).length,
        marcos_imported: importedMarcos.upserted,
        marcos_missing: missingMarcoIds.length,
        settlements: settlementStats,
      },
    }
  } finally {
    await releaseAtSyncLock(supabase, LOCK)
  }
}
