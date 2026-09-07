import { describe, expect, it } from "vitest"
import type { Contract } from "@/types/contract"
import type { Settlement } from "@/types/settlement"
import type { RetrocomisionSchedule } from "@/lib/supabase/retrocomision-schedules"
import {
  buildRetrocomisionClawbackDescription,
  computeRetrocomisionClawback,
  getMesesTranscurridosEntreActivacionYBaja,
} from "@/lib/erp/contract-clawback"

function schedule(
  overrides: Partial<RetrocomisionSchedule> &
    Pick<RetrocomisionSchedule, "compania" | "segmento" | "tipoCalculo">
): RetrocomisionSchedule {
  return {
    id: overrides.id ?? "sched-1",
    peajeTramo: overrides.peajeTramo ?? null,
    mesesFlat: overrides.mesesFlat ?? null,
    tramos: overrides.tramos ?? [],
    notas: overrides.notas ?? null,
    activo: overrides.activo ?? true,
    ...overrides,
  }
}

const SCHEDULES: RetrocomisionSchedule[] = [
  schedule({
    compania: "Naturgy",
    segmento: "residencial",
    tipoCalculo: "meses_flat",
    mesesFlat: 4,
  }),
  schedule({
    compania: "Repsol",
    segmento: "pyme",
    tipoCalculo: "tramos_porcentaje",
    tramos: [
      { desde_mes: 0, hasta_mes: 1, valor: 100, unidad: "porcentaje" },
      { desde_mes: 5, hasta_mes: 6, valor: 55, unidad: "porcentaje" },
      { desde_mes: 11, hasta_mes: 12, valor: 0, unidad: "porcentaje" },
    ],
  }),
]

const baseContract: Contract = {
  id: "con-1",
  clientName: "Cliente Test",
  cups: "ES0021000000000001AB",
  tipo: "luz",
  compania: "Naturgy",
  tarifa: "2.0TD",
  consumoAnual: 5000,
  montoInterno: 100,
  montoExterno: 80,
  estado: "ACTIVADO",
  comercialId: "usr-1",
  comercialName: "Comercial Test",
  createdAt: "2026-01-01",
  estadoEfectivoDesde: "2026-01-01",
  tipoCliente: "residencial",
  atr: "2.0TD",
}

describe("computeRetrocomisionClawback", () => {
  it("calcula meses transcurridos entre activación y baja", () => {
    expect(getMesesTranscurridosEntreActivacionYBaja("2026-01-15", "2026-03-10")).toBe(2)
  })

  it("Naturgy residencial mes 2: 100% de comisión original", () => {
    const result = computeRetrocomisionClawback(
      baseContract,
      "2026-03-01",
      SCHEDULES
    )

    expect(result.hasClawback).toBe(true)
    expect(result.porcentajeAplicado).toBe(100)
    expect(result.clawbackAmount).toBe(80)
  })

  it("Naturgy residencial mes 4+: sin retrocomisión", () => {
    const result = computeRetrocomisionClawback(
      baseContract,
      "2026-05-01",
      SCHEDULES
    )

    expect(result.hasClawback).toBe(false)
    expect(result.clawbackAmount).toBe(0)
  })

  it("Naturgy residencial mes 5: sin liquidación negativa (plazo flat 4 meses)", () => {
    const result = computeRetrocomisionClawback(
      baseContract,
      "2026-06-01",
      SCHEDULES
    )

    expect(result.mesesTranscurridos).toBe(5)
    expect(result.hasClawback).toBe(false)
    expect(result.clawbackAmount).toBe(0)
  })

  it("usa comisión de liquidación de activación si existe", () => {
    const activationSettlement: Settlement = {
      id: "liq-1",
      contractId: "con-1",
      comercialId: "usr-1",
      comercialName: "Comercial Test",
      montoInterno: 120,
      montoExterno: 90,
      estado: "pendiente",
      tipo: "luz",
      tipoEvento: "activacion",
      descripcion: "Comisión de activación",
      createdAt: "2026-01-01",
    }

    const result = computeRetrocomisionClawback(
      baseContract,
      "2026-02-01",
      SCHEDULES,
      [activationSettlement]
    )

    expect(result.clawbackAmount).toBe(90)
  })

  it("genera descripción legible con CUPS y porcentaje", () => {
    const clawback = computeRetrocomisionClawback(baseContract, "2026-02-01", SCHEDULES)
    const description = buildRetrocomisionClawbackDescription(baseContract, clawback)

    expect(description).toContain("Retrocomisión")
    expect(description).toContain(baseContract.cups)
    expect(description).toContain("100%")
  })

  it("Repsol pyme mes 5: aplica porcentaje del tramo (55%)", () => {
    const repsolContract: Contract = {
      ...baseContract,
      compania: "Repsol",
      tipoCliente: "pyme",
      montoExterno: 200,
    }

    const result = computeRetrocomisionClawback(
      repsolContract,
      "2026-06-01",
      SCHEDULES
    )

    expect(result.porcentajeAplicado).toBe(55)
    expect(result.clawbackAmount).toBe(110)
  })
})
