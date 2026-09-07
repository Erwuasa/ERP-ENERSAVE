import { describe, expect, it } from "vitest"
import {
  applyLiquidacionTableOrdering,
  countLiquidacionRowsByCompania,
  filterRowsForAdminScope,
  formatLiquidacionPeajeLabel,
  formatLiquidacionSegmentoLabel,
  groupRowsByEquipoDirector,
  matchesCompaniaFilter,
  normalizeLiquidacionSegmentoKey,
  resolveEffectiveComision,
  resolveLiquidacionCompania,
  type LiquidacionInternaRow,
} from "./liquidaciones-internas"
import type { Alegacion } from "../types/alegacion"
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

describe("filterRowsForAdminScope", () => {
  const profiles = [
    { id: "j1", fullName: "Director", role: "jefe_comercial" },
    { id: "c1", fullName: "Ana", role: "comercial", managerId: "j1" },
    { id: "c2", fullName: "Luis", role: "comercial" },
  ] as const

  const rows = [
    { comercialId: "j1", comision: 10 },
    { comercialId: "c1", comision: 20 },
    { comercialId: "c2", comision: 30 },
  ] as LiquidacionInternaRow[]

  it("filtra por director comercial", () => {
    expect(
      filterRowsForAdminScope([...rows], [...profiles], "director", "all").map((r) => r.comercialId)
    ).toEqual(["j1"])
  })

  it("filtra por equipo de director", () => {
    expect(
      filterRowsForAdminScope([...rows], [...profiles], "equipo", "j1").map((r) => r.comercialId)
    ).toEqual(["c1"])
  })
})

describe("normalizeLiquidacionSegmentoKey", () => {
  it("ignora luz/gas como segmento de cliente", () => {
    expect(normalizeLiquidacionSegmentoKey("luz")).toBeNull()
    expect(normalizeLiquidacionSegmentoKey("gas")).toBeNull()
  })

  it("detecta residencial y pyme", () => {
    expect(normalizeLiquidacionSegmentoKey("residencial")).toBe("residencial")
    expect(normalizeLiquidacionSegmentoKey("pyme")).toBe("pyme")
  })
})

describe("groupRowsByEquipoDirector", () => {
  it("agrupa por director y omite filas sin jefe", () => {
    const groups = groupRowsByEquipoDirector([
      {
        comercialId: "c1",
        jefeEquipoId: "j1",
        jefeEquipoName: "Director",
      },
      { comercialId: "c2" },
    ] as LiquidacionInternaRow[])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.title).toBe("Equipo de Director")
    expect(groups[0]?.rows).toHaveLength(1)
  })
})

describe("resolveEffectiveComision", () => {
  it("usa comision ajustada cuando existe", () => {
    const row = { comision: 100 } as LiquidacionInternaRow
    expect(
      resolveEffectiveComision(row, {
        comisionAjustada: 75,
      } as Alegacion)
    ).toBe(75)
  })
})

describe("applyLiquidacionTableOrdering", () => {
  const rows = [
    {
      segmento: "residencial",
      fechaActivacion: "2026-01-01",
      comision: 10,
    },
    {
      segmento: "pyme",
      fechaActivacion: "2026-06-01",
      comision: 50,
    },
    {
      segmento: "residencial",
      fechaActivacion: "2026-03-01",
      comision: 30,
    },
  ] as LiquidacionInternaRow[]

  it("filtra residencial y ordena por activación descendente", () => {
    const ordered = applyLiquidacionTableOrdering(rows, {
      segmentoFilter: "residencial",
      activacionSort: "desc",
      comisionSort: null,
    })
    expect(ordered).toHaveLength(2)
    expect(ordered[0]?.fechaActivacion).toBe("2026-03-01")
  })

  it("ordena por comisión descendente", () => {
    const ordered = applyLiquidacionTableOrdering(rows, {
      segmentoFilter: "all",
      activacionSort: "desc",
      comisionSort: "desc",
    })
    expect(ordered[0]?.comision).toBe(50)
  })

  it("excluye luz del filtro residencial", () => {
    const mixed = [
      ...rows,
      { segmento: "luz", fechaActivacion: "2026-02-01", comision: 5 },
    ] as LiquidacionInternaRow[]
    const ordered = applyLiquidacionTableOrdering(mixed, {
      segmentoFilter: "residencial",
      activacionSort: "desc",
      comisionSort: null,
    })
    expect(ordered.every((row) => row.segmento === "residencial")).toBe(true)
  })
})

describe("formatLiquidacionPeajeLabel", () => {
  it("acorta peaje a versión corta", () => {
    expect(formatLiquidacionPeajeLabel("2.0TD")).toBe("2.0")
    expect(formatLiquidacionPeajeLabel("3.0TD")).toBe("3.0")
  })
})

describe("formatLiquidacionSegmentoLabel", () => {
  it("formatea etiquetas legibles", () => {
    expect(formatLiquidacionSegmentoLabel("residencial")).toBe("Residencial")
    expect(formatLiquidacionSegmentoLabel("luz")).toBe("—")
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

