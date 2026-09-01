import { describe, expect, it } from "vitest"
import type { Contract } from "../types/contract"
import {
  calcularLiquidacionMensualPorComercial,
  calcularLiquidacionesMensualesTodoElEquipo,
  isDateInMonthYear,
  sumLiquidacionesMensualesComisionado,
} from "./liquidaciones-mensuales"
import { catalogEntryToRow } from "./supabase/marco-retributivo"

const noopFormat = (value: number) => `${value.toFixed(2)} €`

const iberdrolaRow = catalogEntryToRow({
  id: "iberdrola-luz-estable-20",
  compania: "Iberdrola",
  tarifa: "Plan Estable Luz",
  tipo: "luz",
  peaje: "2.0TD",
  condiciones: "",
  comisionTipo: "fija",
  comisionBase: 80,
  comisionUnidad: "eur_cups",
  vigenciaMeses: 0,
})

const endesaRow = catalogEntryToRow({
  id: "endesa-luz-fija-20",
  compania: "Endesa",
  tarifa: "One Luz Fija Directa",
  tipo: "luz",
  peaje: "2.0TD",
  condiciones: "",
  comisionTipo: "fija",
  comisionBase: 100,
  comisionUnidad: "eur_cups",
  vigenciaMeses: 0,
})

const marcoRows = [iberdrolaRow, endesaRow]

function contract(partial: Partial<Contract> & Pick<Contract, "id">): Contract {
  return {
    clientName: "Cliente Test",
    cups: "ES0021000000000000000000",
    tipo: "luz",
    compania: "Iberdrola",
    tarifa: "Plan Estable Luz",
    marcoEntryId: iberdrolaRow.id,
    consumoAnual: 3600,
    montoInterno: 0,
    montoExterno: 0,
    estado: "ACTIVADO",
    comercialId: "com-1",
    comercialName: "Alejandro Rueda",
    createdAt: "2026-08-10",
    estadoEfectivoDesde: "2026-08-15",
    ...partial,
  }
}

const comerciales = [
  {
    id: "com-1",
    fullName: "Alejandro Rueda",
    commissionPercentage: 50,
    activo: true,
  },
  {
    id: "com-2",
    fullName: "Ricardo Monsalve",
    commissionPercentage: 70,
    activo: true,
  },
]

describe("isDateInMonthYear", () => {
  it("detecta activación dentro del mes", () => {
    expect(isDateInMonthYear("2026-08-15", 8, 2026)).toBe(true)
    expect(isDateInMonthYear("2026-07-31", 8, 2026)).toBe(false)
  })
})

describe("calcularLiquidacionMensualPorComercial", () => {
  it("suma comisiones de contratos activados en el mes", () => {
    const contracts = [
      contract({ id: "c1", comercialId: "com-1", estadoEfectivoDesde: "2026-08-05" }),
      contract({ id: "c2", comercialId: "com-1", estadoEfectivoDesde: "2026-08-20" }),
      contract({ id: "c3", comercialId: "com-1", estado: "PTE DE TRAMITACIÓN" }),
      contract({ id: "c4", comercialId: "com-2", estadoEfectivoDesde: "2026-08-12" }),
    ]

    const result = calcularLiquidacionMensualPorComercial(
      contracts,
      "com-1",
      8,
      2026,
      comerciales,
      noopFormat,
      marcoRows
    )

    expect(result.desglosePorContrato).toHaveLength(2)
    expect(result.totalComisionado).toBeGreaterThan(0)
    expect(result.totalBruto).toBeGreaterThanOrEqual(result.totalComisionado)
  })
})

describe("calcularLiquidacionesMensualesTodoElEquipo", () => {
  it("recorre comerciales activos con contratos en el mes", () => {
    const contracts = [
      contract({ id: "c1", comercialId: "com-1" }),
      contract({
        id: "c2",
        comercialId: "com-2",
        compania: "Endesa",
        tarifa: "One Luz Fija Directa",
        marcoEntryId: endesaRow.id,
      }),
    ]

    const liquidaciones = calcularLiquidacionesMensualesTodoElEquipo(
      contracts,
      comerciales,
      8,
      2026,
      noopFormat,
      marcoRows
    )

    expect(liquidaciones).toHaveLength(2)
    expect(sumLiquidacionesMensualesComisionado(liquidaciones)).toBeGreaterThan(0)
  })
})
