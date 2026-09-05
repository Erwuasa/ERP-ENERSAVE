import { describe, expect, it } from "vitest"
import {
  countLiquidacionRowsByCompania,
  matchesCompaniaFilter,
  resolveLiquidacionCompania,
  type LiquidacionInternaRow,
} from "./liquidaciones-internas"
import type { Contract } from "../types/contract"
import type { Settlement } from "../types/settlement"
import type { MarcoRetributivoRow } from "./supabase/marco-retributivo"

function settlement(patch: Partial<Settlement> = {}): Settlement {
  return {
    id: "s1",
    comercialId: "c1",
    comercialName: "Ana",
    montoInterno: 0,
    montoExterno: 0,
    estado: "pendiente",
    tipo: "luz",
    descripcion: "Liquidación AT",
    createdAt: "2026-09-01",
    ...patch,
  }
}

function contract(patch: Partial<Contract> = {}): Contract {
  return {
    id: "ct1",
    clientName: "Cliente",
    cups: "ES0001",
    tipo: "luz",
    compania: "AT",
    tarifa: "Plan Estable",
    consumoAnual: 3000,
    montoInterno: 0,
    montoExterno: 0,
    estado: "ACTIVADO",
    comercialId: "c1",
    comercialName: "Ana",
    createdAt: "2026-08-01",
    ...patch,
  }
}

describe("matchesCompaniaFilter", () => {
  it("acepta Todos y rechaza placeholders", () => {
    expect(matchesCompaniaFilter("AT", "Todos")).toBe(true)
    expect(matchesCompaniaFilter("AT", "Repsol")).toBe(false)
    expect(matchesCompaniaFilter("—", "Endesa")).toBe(false)
  })

  it("iguala alias y nombres comerciales de AT", () => {
    expect(matchesCompaniaFilter("REPSOL COMERCIALIZADORA", "Repsol")).toBe(true)
    expect(matchesCompaniaFilter("ENDESA ENERGIA", "Endesa")).toBe(true)
    expect(matchesCompaniaFilter("Total Energies", "TotalEnergies")).toBe(true)
    expect(matchesCompaniaFilter("Factor Energía", "Factorenergia")).toBe(true)
    expect(matchesCompaniaFilter("Iberdrola Clientes", "Naturgy")).toBe(false)
  })
})

describe("resolveLiquidacionCompania", () => {
  it("usa la compañía del contrato si no es AT", () => {
    expect(
      resolveLiquidacionCompania(contract({ compania: "Repsol Comercializadora" }), settlement())
    ).toBe("Repsol Comercializadora")
  })

  it("resuelve AT desde el marco o la tarifa", () => {
    const marco = {
      id: "m1",
      compania: "Endesa",
      tarifa: "Plan Estable",
      tipo: "luz",
    } as MarcoRetributivoRow

    expect(
      resolveLiquidacionCompania(contract({ marcoEntryId: "m1" }), settlement(), [marco])
    ).toBe("Endesa")
    expect(resolveLiquidacionCompania(contract(), settlement(), [marco])).toBe("Endesa")
  })

  it("infiere la marca desde la descripción", () => {
    expect(
      resolveLiquidacionCompania(undefined, settlement({ descripcion: "Liq. Naturgy agosto" }))
    ).toBe("Naturgy")
  })
})

describe("countLiquidacionRowsByCompania", () => {
  it("cuenta por marca y en Todos", () => {
    const rows = [
      { compania: "Repsol Comercializadora", settlement: settlement() },
      { compania: "Naturgy", settlement: settlement() },
      { compania: "REPSOL", settlement: settlement() },
    ] as LiquidacionInternaRow[]

    const counts = countLiquidacionRowsByCompania(rows, {
      tab: "totales",
      dateFrom: "2026-09-01",
      dateTo: "2026-09-30",
      search: "",
    })

    expect(counts.Todos).toBe(3)
    expect(counts.Repsol).toBe(2)
    expect(counts.Naturgy).toBe(1)
    expect(counts.Endesa).toBe(0)
  })
})

