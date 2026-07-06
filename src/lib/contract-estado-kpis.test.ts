import { describe, expect, it } from "vitest"
import {
  countContractsByEstadoKpi,
  getContractEstadoKpiBucket,
  matchesContractEstadoKpiFilter,
} from "./contract-estado-kpis"

describe("getContractEstadoKpiBucket", () => {
  it("maps firma caducada to incidencia administrativa bucket", () => {
    expect(getContractEstadoKpiBucket("FIRMA CADUCADA")).toBe(
      "incidencia_administrativa"
    )
    expect(getContractEstadoKpiBucket("firma caducada")).toBe(
      "incidencia_administrativa"
    )
  })

  it("maps legacy estados", () => {
    expect(getContractEstadoKpiBucket("Pendiente de firma")).toBe("pte_firma")
    expect(getContractEstadoKpiBucket("Activado")).toBe("activado")
    expect(getContractEstadoKpiBucket("Temporal")).toBe("tramitando")
    expect(getContractEstadoKpiBucket("Incidencia")).toBe("incidencia_administrativa")
  })
})

describe("countContractsByEstadoKpi", () => {
  it("aggregates by dashboard buckets", () => {
    const counts = countContractsByEstadoKpi([
      { estado: "PTE DE FIRMA" },
      { estado: "Activado" },
      { estado: "TRAMITANDO" },
      { estado: "FIRMA CADUCADA" },
      { estado: "INCIDENCIA ADMINISTRATIVA" },
      { estado: "Dado de Baja" },
    ])
    expect(counts).toEqual({
      pte_firma: 1,
      activado: 1,
      tramitando: 1,
      incidencia_administrativa: 2,
    })
  })
})

describe("matchesContractEstadoKpiFilter", () => {
  it("filters incidencia bucket including firma caducada", () => {
    expect(
      matchesContractEstadoKpiFilter("FIRMA CADUCADA", "incidencia_administrativa")
    ).toBe(true)
    expect(
      matchesContractEstadoKpiFilter("Activado", "incidencia_administrativa")
    ).toBe(false)
  })
})
