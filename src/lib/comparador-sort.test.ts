import { describe, expect, it } from "vitest"
import {
  resolveComparadorMarcoEntry,
  sortComparadorOptions,
} from "./comparador-sort"

const formatCurrency = (val: number) => `${val.toFixed(2)} €`

describe("resolveComparadorMarcoEntry", () => {
  it("resuelve tarifa con prefijo de compañía", () => {
    const entry = resolveComparadorMarcoEntry(
      "Iberdrola",
      "Iberdrola Plan Estable Luz",
      "2.0TD"
    )
    expect(entry?.tarifa).toBe("Plan Estable Luz")
  })

  it("resuelve tarifa por coincidencia parcial y peaje", () => {
    const entry = resolveComparadorMarcoEntry(
      "Endesa",
      "Endesa Negocio Fórmula Variable",
      "3.0TD"
    )
    expect(entry?.tarifa).toBe("Negocio Fórmula Variable")
  })
})

describe("sortComparadorOptions", () => {
  const baseOptions = [
    {
      id: "a",
      companyName: "Iberdrola",
      tariffName: "Iberdrola Plan Estable Luz",
      savingsAnnual: 500,
    },
    {
      id: "b",
      companyName: "Endesa",
      tariffName: "Endesa One Luz 3 Periodos",
      savingsAnnual: 800,
    },
    {
      id: "c",
      companyName: "Naturgy",
      tariffName: "Naturgy Tarifa Por Uso",
      savingsAnnual: 300,
    },
  ]

  const params = {
    accessTariff: "2.0TD",
    commissionPercentage: 50,
    consumoAnual: 3600,
    formatCurrency,
  }

  it("ordena por ahorro descendente por defecto", () => {
    const sorted = sortComparadorOptions(baseOptions, "ahorro", params)
    expect(sorted.map((o) => o.id)).toEqual(["b", "a", "c"])
    expect(sorted[0].isBestOption).toBe(true)
  })

  it("ordena por comisión descendente sin ocultar ahorro", () => {
    const sorted = sortComparadorOptions(baseOptions, "comision", params)
    expect(sorted.every((o) => typeof o.savingsAnnual === "number")).toBe(true)
    expect(sorted.every((o) => typeof o.commissionEur === "number")).toBe(true)
    expect(sorted[0].commissionEur).toBeGreaterThanOrEqual(sorted[1].commissionEur)
    expect(sorted[0].isBestOption).toBe(true)
  })
})
