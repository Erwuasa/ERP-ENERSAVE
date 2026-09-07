import { describe, expect, it } from "vitest"
import {
  applyLiquidacionTableOrdering,
  compareLiquidacionSegmentoSort,
  buildLiquidacionCompaniaFilterOptions,
  filterLiquidacionRowsForCompaniaCounts,
  filterRowsForAdminScope,
  formatLiquidacionPeajeLabel,
  formatLiquidacionSegmentoLabel,
  groupRowsByEquipoDirector,
  matchesCompaniaFilter,
  normalizeLiquidacionSegmentoKey,
  resolveEffectiveComision,
  resolveLiquidacionCompania,
  resolveLiquidacionSegmentoKey,
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
      resolveLiquidacionCompania(contract({ compania: "AT" }), settlement(), [marco])
    ).toBe("Endesa")
    expect(
      resolveLiquidacionCompania(contract({ marcoEntryId: "m1" }), settlement(), [marco])
    ).toBe("Endesa")
    expect(resolveLiquidacionCompania(contract(), settlement(), [marco])).toBe("Endesa")
  })

  it("nunca devuelve AT como compañía visible", () => {
    expect(resolveLiquidacionCompania(contract({ compania: "AT" }), settlement())).toBe("—")
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

  it("mantiene todas las filas en modo todos", () => {
    expect(filterRowsForAdminScope([...rows], [...profiles], "todos", "").map((r) => r.comercialId)).toEqual([
      "j1",
      "c1",
      "c2",
    ])
  })

  it("requiere selección en modos acotados", () => {
    expect(filterRowsForAdminScope([...rows], [...profiles], "comercial", "")).toEqual([])
    expect(filterRowsForAdminScope([...rows], [...profiles], "director", "")).toEqual([])
    expect(filterRowsForAdminScope([...rows], [...profiles], "equipo", "")).toEqual([])
  })

  it("filtra por comercial concreto", () => {
    expect(
      filterRowsForAdminScope([...rows], [...profiles], "comercial", "c1").map((r) => r.comercialId)
    ).toEqual(["c1"])
  })

  it("filtra por director comercial (solo sus propias liquidaciones)", () => {
    expect(
      filterRowsForAdminScope([...rows], [...profiles], "director", "j1").map((r) => r.comercialId)
    ).toEqual(["j1"])
  })

  it("filtra por equipo de director excluyendo al director", () => {
    expect(
      filterRowsForAdminScope([...rows], [...profiles], "equipo", "j1").map((r) => r.comercialId)
    ).toEqual(["c1"])
  })
})

describe("resolveLiquidacionSegmentoKey", () => {
  it("normaliza autonomo y empresa al bucket pyme", () => {
    expect(resolveLiquidacionSegmentoKey({ segmento: "autonomo" })).toBe("pyme")
    expect(resolveLiquidacionSegmentoKey({ segmento: "Empresa" })).toBe("pyme")
    expect(resolveLiquidacionSegmentoKey({ segmento: "residencial" })).toBe("residencial")
  })

  it("infiere segmento desde contrato si la fila no lo trae", () => {
    expect(
      resolveLiquidacionSegmentoKey({
        segmento: "—",
        contract: contract({ tipoCliente: "pyme", nif: "B12345678" }),
      })
    ).toBe("pyme")
  })
})

describe("compareLiquidacionSegmentoSort", () => {
  it("ordena residencial antes que pyme en asc", () => {
    const residencial = { segmento: "residencial" } as LiquidacionInternaRow
    const pyme = { segmento: "pyme" } as LiquidacionInternaRow
    expect(compareLiquidacionSegmentoSort(residencial, pyme, "asc")).toBeLessThan(0)
    expect(compareLiquidacionSegmentoSort(pyme, residencial, "desc")).toBeLessThan(0)
  })

  it("deja filas sin segmento al final", () => {
    const residencial = { segmento: "residencial" } as LiquidacionInternaRow
    const unknown = { segmento: "luz" } as LiquidacionInternaRow
    expect(compareLiquidacionSegmentoSort(residencial, unknown, "asc")).toBeLessThan(0)
    expect(compareLiquidacionSegmentoSort(unknown, residencial, "desc")).toBeGreaterThan(0)
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

  it("ordena por segmento asc sin ocultar filas", () => {
    const ordered = applyLiquidacionTableOrdering(rows, {
      segmentoSort: "asc",
      activacionSort: "desc",
      comisionSort: null,
    })
    expect(ordered).toHaveLength(3)
    expect(ordered[0]?.segmento).toBe("residencial")
    expect(ordered[2]?.segmento).toBe("pyme")
  })

  it("ordena por comisión descendente", () => {
    const ordered = applyLiquidacionTableOrdering(rows, {
      segmentoSort: null,
      activacionSort: "desc",
      comisionSort: "desc",
    })
    expect(ordered[0]?.comision).toBe(50)
  })

  it("deja luz al final al ordenar por segmento", () => {
    const mixed = [
      ...rows,
      { segmento: "luz", fechaActivacion: "2026-02-01", comision: 5 },
    ] as LiquidacionInternaRow[]
    const ordered = applyLiquidacionTableOrdering(mixed, {
      segmentoSort: "asc",
      activacionSort: "desc",
      comisionSort: null,
    })
    expect(ordered.at(-1)?.segmento).toBe("luz")
    expect(ordered).toHaveLength(4)
  })
})

describe("formatLiquidacionPeajeLabel", () => {
  it("acorta peaje a versión legible", () => {
    expect(formatLiquidacionPeajeLabel("2.0TD")).toBe("2.0TD")
    expect(formatLiquidacionPeajeLabel("3.0TD")).toBe("3.0TD")
    expect(formatLiquidacionPeajeLabel("6.1TD")).toBe("6.1TD")
  })
})

describe("formatLiquidacionSegmentoLabel", () => {
  it("formatea etiquetas legibles", () => {
    expect(formatLiquidacionSegmentoLabel("residencial")).toBe("Residencial")
    expect(formatLiquidacionSegmentoLabel("luz")).toBe("—")
  })
})

describe("buildLiquidacionCompaniaFilterOptions", () => {
  it("agrupa marcas, omite contadores cero y ordena por volumen", () => {
    const rows = [
      { compania: "Repsol Comercializadora", settlement: settlement() },
      { compania: "Naturgy", settlement: settlement() },
      { compania: "REPSOL", settlement: settlement() },
      { compania: "Factorenergia", settlement: settlement() },
      { compania: "—", settlement: settlement() },
    ] as LiquidacionInternaRow[]

    const options = buildLiquidacionCompaniaFilterOptions(rows)

    expect(options).toEqual([
      { name: "Repsol", count: 2 },
      { name: "Factorenergia", count: 1 },
      { name: "Naturgy", count: 1 },
    ])
    expect(options.every((option) => option.count > 0)).toBe(true)
    expect(options.some((option) => option.name === "Endesa")).toBe(false)
  })

  it("respeta tab, fechas y búsqueda al calcular el pool", () => {
    const rows = [
      {
        compania: "Endesa",
        segmento: "residencial",
        fechaActivacion: "2026-09-10",
        settlement: settlement({ estado: "pendiente" }),
      },
      {
        compania: "Naturgy",
        segmento: "pyme",
        fechaActivacion: "2026-09-10",
        settlement: settlement({ estado: "pendiente" }),
      },
    ] as LiquidacionInternaRow[]

    const pool = filterLiquidacionRowsForCompaniaCounts(rows, {
      tab: "pendientes",
      dateFrom: "2026-09-01",
      dateTo: "2026-09-30",
      search: "",
    })

    expect(buildLiquidacionCompaniaFilterOptions(pool)).toEqual([
      { name: "Endesa", count: 1 },
      { name: "Naturgy", count: 1 },
    ])
  })
})

