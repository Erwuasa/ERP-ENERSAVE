import { asNumber, asString, getSupabaseAdmin } from './at-api.ts'
import { parseManualOverrides } from './manual-overrides.ts'

const DEFAULT_KWH_PRICE = 0.15

type Admin = ReturnType<typeof getSupabaseAdmin>

type ContractRow = {
  id: string
  estado: string | null
  marco_entry_id: string | null
  consumo_anual: number | null
  consumo_anual_manual: number | null
  comercial_id: string | null
  comercial_name: string | null
  tipo: string | null
  client_name: string | null
  cups: string | null
  fecha_baja: string | null
  estado_efectivo_desde: string | null
  monto_interno: number | null
  monto_externo: number | null
}

type MarcoRow = {
  id: string
  comision_tipo: string | null
  comision_base: number | null
  comision_unidad: string | null
}

type SettlementRow = {
  id: string
  contrato_id: string | null
  tipo_evento: string | null
  source: string | null
  monto_interno: number | null
  monto_externo: number | null
  manual_overrides: unknown
  estado: string | null
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function marcoAmounts(
  marco: MarcoRow,
  commissionPercentage: number,
  consumoAnual: number
): { empresa: number; comercial: number } {
  const base = asNumber(marco.comision_base) ?? 0
  const rate = commissionPercentage / 100
  let empresa = 0
  if (marco.comision_tipo === 'fija') {
    empresa = base
  } else if (marco.comision_unidad === 'porcentaje_consumo') {
    empresa = consumoAnual * (base / 100)
  } else {
    empresa = consumoAnual * DEFAULT_KWH_PRICE * (base / 100)
  }
  return {
    empresa: roundMoney(empresa),
    comercial: roundMoney(empresa * rate),
  }
}

function isActivado(estado: string | null): boolean {
  return (estado ?? '').trim().toUpperCase() === 'ACTIVADO'
}

function isBaja(estado: string | null): boolean {
  return (estado ?? '').toLowerCase().includes('baja')
}

function isErpSettlement(row: SettlementRow): boolean {
  return row.source !== 'at'
}

function hasAmountOverride(row: SettlementRow): boolean {
  const overrides = parseManualOverrides(row.manual_overrides)
  return overrides.monto_interno === true || overrides.monto_externo === true
}

export async function ensureMarcoSettlements(
  supabase: Admin,
  contractIds: string[]
): Promise<{ created: number; updated: number; skipped: number }> {
  const uniqueIds = [...new Set(contractIds.filter(Boolean))]
  const stats = { created: 0, updated: 0, skipped: 0 }
  if (uniqueIds.length === 0) return stats

  const { data: contracts, error: contractsError } = await supabase
    .from('contratos_equipo')
    .select(
      'id, estado, marco_entry_id, consumo_anual, consumo_anual_manual, comercial_id, comercial_name, tipo, client_name, cups, fecha_baja, estado_efectivo_desde, monto_interno, monto_externo'
    )
    .in('id', uniqueIds)
  if (contractsError) throw new Error(`marco settlements contracts: ${contractsError.message}`)

  const rows = (contracts ?? []) as ContractRow[]
  const marcoIds = [...new Set(rows.map((row) => row.marco_entry_id).filter(Boolean))] as string[]
  const comercialIds = [...new Set(rows.map((row) => row.comercial_id).filter(Boolean))] as string[]

  const [{ data: marcos }, { data: profiles }, { data: settlements }] = await Promise.all([
    marcoIds.length > 0
      ? supabase
          .from('marco_retributivo')
          .select('id, comision_tipo, comision_base, comision_unidad')
          .in('id', marcoIds)
      : Promise.resolve({ data: [] as MarcoRow[] }),
    comercialIds.length > 0
      ? supabase.from('user_profiles').select('id, commission_percentage').in('id', comercialIds)
      : Promise.resolve({ data: [] as Array<{ id: string; commission_percentage: number | null }> }),
    supabase
      .from('settlements')
      .select('id, contrato_id, tipo_evento, source, monto_interno, monto_externo, manual_overrides, estado')
      .in('contrato_id', uniqueIds)
      .in('tipo_evento', ['activacion', 'retrocomision']),
  ])

  const marcoById = new Map(((marcos ?? []) as MarcoRow[]).map((row) => [row.id, row]))
  const pctByComercial = new Map(
    ((profiles ?? []) as Array<{ id: string; commission_percentage: number | null }>).map((row) => [
      row.id,
      Number(row.commission_percentage ?? 70),
    ])
  )
  const settlementsByContract = new Map<string, SettlementRow[]>()
  for (const settlement of (settlements ?? []) as SettlementRow[]) {
    const contractId = settlement.contrato_id
    if (!contractId) continue
    const list = settlementsByContract.get(contractId) ?? []
    list.push(settlement)
    settlementsByContract.set(contractId, list)
  }

  const toInsert: Array<Record<string, unknown>> = []
  const toUpdate: Array<{ id: string; patch: Record<string, unknown> }> = []

  for (const contract of rows) {
    const existing = settlementsByContract.get(contract.id) ?? []
    const activation = existing.find(
      (row) => row.tipo_evento === 'activacion' && isErpSettlement(row)
    )
    const retro = existing.find(
      (row) => row.tipo_evento === 'retrocomision' && isErpSettlement(row)
    )

    if (isActivado(contract.estado)) {
      const marco = contract.marco_entry_id ? marcoById.get(contract.marco_entry_id) : undefined
      if (!marco) {
        stats.skipped += 1
        continue
      }
      const consumo =
        asNumber(contract.consumo_anual_manual) ?? asNumber(contract.consumo_anual) ?? 0
      if (marco.comision_tipo !== 'fija' && consumo <= 0) {
        stats.skipped += 1
        continue
      }
      const pct = contract.comercial_id ? (pctByComercial.get(contract.comercial_id) ?? 70) : 0
      const amounts = marcoAmounts(marco, pct, consumo)
      if (amounts.empresa === 0 && amounts.comercial === 0) {
        stats.skipped += 1
        continue
      }
      if (activation) {
        if (hasAmountOverride(activation)) {
          stats.skipped += 1
          continue
        }
        toUpdate.push({
          id: activation.id,
          patch: {
            monto_interno: amounts.empresa,
            monto_externo: amounts.comercial,
            comercial_id: contract.comercial_id,
            comercial_name: asString(contract.comercial_name),
            tipo: contract.tipo === 'gas' ? 'gas' : 'luz',
            source: 'manual',
          },
        })
        continue
      }
      toInsert.push({
        contrato_id: contract.id,
        comercial_id: contract.comercial_id,
        comercial_name: asString(contract.comercial_name),
        tipo: contract.tipo === 'gas' ? 'gas' : 'luz',
        monto_interno: amounts.empresa,
        monto_externo: amounts.comercial,
        estado: 'pendiente',
        tipo_evento: 'activacion',
        source: 'manual',
        descripcion: `Comisión de activación — ${asString(contract.client_name)} (CUPS: ${asString(contract.cups)})`,
        created_at: `${(asString(contract.estado_efectivo_desde) || new Date().toISOString()).slice(0, 10)}T12:00:00.000Z`,
      })
      continue
    }

    if (!isBaja(contract.estado)) continue

    if (retro) {
      stats.skipped += 1
      continue
    }

    const empresa = roundMoney(
      activation?.monto_interno != null
        ? -Math.abs(Number(activation.monto_interno))
        : contract.monto_interno != null
          ? -Math.abs(Number(contract.monto_interno))
          : 0
    )
    const comercial = roundMoney(
      activation?.monto_externo != null
        ? -Math.abs(Number(activation.monto_externo))
        : contract.monto_externo != null
          ? -Math.abs(Number(contract.monto_externo))
          : 0
    )
    if (empresa === 0 && comercial === 0) {
      stats.skipped += 1
      continue
    }

    const bajaDate = (asString(contract.fecha_baja) || new Date().toISOString()).slice(0, 10)
    toInsert.push({
      contrato_id: contract.id,
      comercial_id: contract.comercial_id,
      comercial_name: asString(contract.comercial_name),
      tipo: contract.tipo === 'gas' ? 'gas' : 'luz',
      monto_interno: empresa,
      monto_externo: comercial,
      estado: 'pendiente',
      tipo_evento: 'retrocomision',
      source: 'manual',
      es_retrocomision: true,
      fecha_baja: `${bajaDate}T12:00:00.000Z`,
      descripcion: `Retrocomisión por baja — ${asString(contract.client_name)} (CUPS: ${asString(contract.cups)})`,
      created_at: `${bajaDate}T12:00:00.000Z`,
    })
  }

  for (const item of toUpdate) {
    const { error } = await supabase.from('settlements').update(item.patch).eq('id', item.id)
    if (error) throw new Error(`marco settlement update: ${error.message}`)
    stats.updated += 1
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('settlements').insert(toInsert)
    if (error) throw new Error(`marco settlement insert: ${error.message}`)
    stats.created += toInsert.length
  }

  return stats
}

