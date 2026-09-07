import { describe, expect, it } from "vitest"
import type { Contract } from "../types/contract"
import type { Settlement } from "../types/settlement"
import type { RetrocomisionSchedule } from "./supabase/retrocomision-schedules"
import {
  buildActivationSettlement,
  buildRetrocomisionSettlement,
} from "./contract-settlements"
import {
  buildRetrocomisionClawbackDescription,
  computeRetrocomisionClawback,
} from "./erp/contract-clawback"
import {
  enrichSettlementRow,
  isRetrocomisionSettlement,
  sumComisionRows,
  type LiquidacionInternaRow,
  type ProfileRow,
} from "./liquidaciones-internas"

function schedule(
  overrides: Partial<RetrocomisionSchedule> &
    Pick<RetrocomisionSchedule, "compania" | "segmento" | "tipoCalculo">
): RetrocomisionSchedule {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    peajeTramo: overrides.peajeTramo ?? null,
    mesesFlat: overrides.mesesFlat ?? null,
    tramos: overrides.tramos ?? [],
    notas: overrides.notas ?? null,
    activo: overrides.activo ?? true,
    ...overrides,
  }
}

const RETRO_SCHEDULES: RetrocomisionSchedule[] = [
  schedule({
    compania: "Naturgy",
    segmento: "residencial",
    tipoCalculo: "meses_flat",
    mesesFlat: 4,
  }),
  schedule({
    compania: "Naturgy",
    segmento: "pyme",
    tipoCalculo: "tramos_porcentaje",
    tramos: [
      { desde_mes: 0, hasta_mes: 6, valor: 100, unidad: "porcentaje" },
      { desde_mes: 6, hasta_mes: 9, valor: 50, unidad: "porcentaje" },
      { desde_mes: 9, hasta_mes: 12, valor: 25, unidad: "porcentaje" },
    ],
  }),
  schedule({
    compania: "Endesa",
    segmento: "residencial",
    tipoCalculo: "meses_flat",
    mesesFlat: 6,
  }),
]

const PROFILES: ProfileRow[] = [
  {
    id: "com-1",
    fullName: "Comercial Test",
    role: "comercial",
    commissionPercentage: 70,
  },
]

function addMonthsIso(iso: string, months: number): string {
  const [year, month, day] = iso.split("-").map(Number)
  const date = new Date(year, (month ?? 1) - 1 + months, day ?? 1)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function baseContract(partial: Partial<Contract> & Pick<Contract, "id" | "compania">): Contract {
  return {
    clientName: "Cliente PYME Demo",
    cups: "ES0021000000000001AB",
    tipo: "luz",
    tarifa: "Negocio 2.0TD",
    consumoAnual: 12000,
    montoInterno: 0,
    montoExterno: 0,
    estado: "PTE DE FIRMA",
    comercialId: "com-1",
    comercialName: "Comercial Test",
    createdAt: "2026-01-01",
    atr: "2.0TD",
    ...partial,
  }
}

function simulateActivation(input: {
  contract: Contract
  activationDate: string
  comisionEmpresa: number
  comisionComercial: number
}): { contract: Contract; settlement: Settlement } {
  const contract: Contract = {
    ...input.contract,
    estado: "ACTIVADO",
    estadoEfectivoDesde: input.activationDate,
    montoInterno: input.comisionEmpresa,
    montoExterno: input.comisionComercial,
  }

  const settlement: Settlement = {
    ...buildActivationSettlement({
      contract,
      activationDate: input.activationDate,
      comisionEmpresa: input.comisionEmpresa,
      comisionComercial: input.comisionComercial,
    }),
    id: `act-${contract.id}`,
  }

  return { contract, settlement }
}

function simulateCancel(input: {
  contract: Contract
  bajaDate: string
  settlements: Settlement[]
  schedules: RetrocomisionSchedule[]
}): {
  contract: Contract
  settlements: Settlement[]
  retroSettlement: Settlement | null
  clawback: ReturnType<typeof computeRetrocomisionClawback>
} {
  const clawback = computeRetrocomisionClawback(
    input.contract,
    input.bajaDate,
    input.schedules,
    input.settlements
  )

  const contract: Contract = {
    ...input.contract,
    estado: "Dado de Baja",
    fechaBaja: input.bajaDate,
    retrocomisionClawback: clawback.hasClawback ? clawback.clawbackAmount : 0,
  }

  if (!clawback.hasClawback || clawback.clawbackAmount <= 0) {
    return {
      contract,
      settlements: input.settlements,
      retroSettlement: null,
      clawback,
    }
  }

  const retroSettlement: Settlement = {
    ...buildRetrocomisionSettlement({
      contract,
      bajaDate: input.bajaDate,
      comisionEmpresa: clawback.internalClawback,
      comisionComercial: clawback.clawbackAmount,
      descripcion: buildRetrocomisionClawbackDescription(contract, clawback),
    }),
    id: `retro-${contract.id}`,
  }

  return {
    contract,
    settlements: [...input.settlements, retroSettlement],
    retroSettlement,
    clawback,
  }
}

function enrichRows(
  contract: Contract,
  settlements: Settlement[]
): LiquidacionInternaRow[] {
  return settlements.map((settlement) =>
    enrichSettlementRow(settlement, [contract], PROFILES, (value) => `${value.toFixed(2)} €`)
  )
}

function computeKpiRetrocomisiones(rows: LiquidacionInternaRow[]): number {
  return sumComisionRows(rows.filter((row) => isRetrocomisionSettlement(row.settlement)))
}

describe("liquidaciones flujo completo E2E", () => {
  it("Naturgy PYME: activación → baja a 7 meses → retro 50% y KPI coherente", () => {
    const activationDate = "2026-01-01"
    const originalComisionComercial = 160
    const originalComisionEmpresa = 200

    const draft = baseContract({
      id: "nat-pyme-1",
      compania: "Naturgy",
      tipoCliente: "pyme",
      clientName: "Taller Mecánico López SL",
      nif: "B12345678",
    })

    const { contract: activated, settlement: activationSettlement } = simulateActivation({
      contract: draft,
      activationDate,
      comisionEmpresa: originalComisionEmpresa,
      comisionComercial: originalComisionComercial,
    })

    expect(activationSettlement.estado).toBe("pendiente")
    expect(activationSettlement.tipoEvento).toBe("activacion")
    expect(activationSettlement.montoExterno).toBe(originalComisionComercial)

    const bajaDate = addMonthsIso(activationDate, 7)
    const cancel = simulateCancel({
      contract: activated,
      bajaDate,
      settlements: [activationSettlement],
      schedules: RETRO_SCHEDULES,
    })

    expect(cancel.clawback.mesesTranscurridos).toBe(7)
    expect(cancel.clawback.porcentajeAplicado).toBe(50)
    expect(cancel.retroSettlement).not.toBeNull()
    expect(cancel.retroSettlement!.montoExterno).toBe(-80)
    expect(cancel.retroSettlement!.montoExterno).toBe(
      -Math.round(originalComisionComercial * 0.5 * 100) / 100
    )
    expect(isRetrocomisionSettlement(cancel.retroSettlement!)).toBe(true)

    const rows = enrichRows(cancel.contract, cancel.settlements)
    expect(rows).toHaveLength(2)

    const retroRow = rows.find((row) => isRetrocomisionSettlement(row.settlement))
    expect(retroRow?.comision).toBe(-80)

    const kpiRetro = computeKpiRetrocomisiones(rows)
    expect(kpiRetro).toBe(-80)
  })

  it("Naturgy residencial: baja a 5 meses fuera del plazo flat → sin liquidación negativa", () => {
    const activationDate = "2026-01-01"
    const originalComisionComercial = 100

    const draft = baseContract({
      id: "nat-res-1",
      compania: "Naturgy",
      tipoCliente: "residencial",
      clientName: "María García",
      tarifa: "Tarifa Residencial 2.0TD",
    })

    const { contract: activated, settlement: activationSettlement } = simulateActivation({
      contract: draft,
      activationDate,
      comisionEmpresa: 130,
      comisionComercial: originalComisionComercial,
    })

    const bajaDate = addMonthsIso(activationDate, 5)
    const cancel = simulateCancel({
      contract: activated,
      bajaDate,
      settlements: [activationSettlement],
      schedules: RETRO_SCHEDULES,
    })

    expect(cancel.contract.fechaBaja).toBe(bajaDate)
    expect(cancel.clawback.mesesTranscurridos).toBe(5)
    expect(cancel.clawback.hasClawback).toBe(false)
    expect(cancel.retroSettlement).toBeNull()

    const rows = enrichRows(cancel.contract, cancel.settlements)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.fechaBaja).toBe(bajaDate)
    expect(computeKpiRetrocomisiones(rows)).toBe(0)
  })

  it("Endesa residencial: baja a 8 meses fuera del periodo flat → sin liquidación negativa", () => {
    const activationDate = "2026-01-01"
    const originalComisionComercial = 120

    const draft = baseContract({
      id: "end-res-1",
      compania: "Endesa",
      tipoCliente: "residencial",
      clientName: "María García",
      tarifa: "One Luz Fija Directa",
    })

    const { contract: activated, settlement: activationSettlement } = simulateActivation({
      contract: draft,
      activationDate,
      comisionEmpresa: 150,
      comisionComercial: originalComisionComercial,
    })

    const bajaDate = addMonthsIso(activationDate, 8)
    const cancel = simulateCancel({
      contract: activated,
      bajaDate,
      settlements: [activationSettlement],
      schedules: RETRO_SCHEDULES,
    })

    expect(cancel.clawback.mesesTranscurridos).toBe(8)
    expect(cancel.clawback.porcentajeAplicado).toBe(0)
    expect(cancel.clawback.hasClawback).toBe(false)
    expect(cancel.retroSettlement).toBeNull()
    expect(cancel.settlements.filter((item) => isRetrocomisionSettlement(item))).toHaveLength(0)

    const rows = enrichRows(cancel.contract, cancel.settlements)
    expect(computeKpiRetrocomisiones(rows)).toBe(0)
  })
})
