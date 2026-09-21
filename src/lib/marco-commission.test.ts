import { describe, expect, it } from "vitest"
import type { MarcoRetributivoEntry } from "@/data/marco-retributivo-catalog"
import { formatMarcoComisionFijaUsuario } from "@/data/marco-retributivo-catalog"
import { estimateMarcoCommissionEur } from "./marco-commission"

const formatCurrency = (value: number) => `${value.toFixed(2)} €`

function makeNaturgyBaseEntry(): MarcoRetributivoEntry {
  return {
    id: "base",
    compania: "Naturgy",
    tarifa: "BASE",
    tipo: "luz",
    peaje: "Todas",
    segmento: "pyme",
    condiciones: "",
    comisionTipo: "fija",
    comisionBase: 96,
    comisionUnidad: "eur_cups",
    vigenciaMeses: 12,
    tramos: [
      {
        desde_kwh: 0,
        hasta_kwh: 9999,
        comision_base: 96,
        condicion: "General (<10 MWh)",
        unidad: "eur_cups",
      },
      {
        desde_kwh: 10000,
        hasta_kwh: 999999999,
        comision_base: 11.2,
        condicion: "10-∞ MWh",
        unidad: "eur_mwh",
      },
    ],
  }
}

describe("formatMarcoComisionFijaUsuario", () => {
  it("escala la comisión base del superadmin al porcentaje del comercial", () => {
    const entry: MarcoRetributivoEntry = {
      id: "naturgy-por-uso",
      compania: "Naturgy",
      tarifa: "Por uso",
      tipo: "luz",
      peaje: "2.0TD",
      condiciones: "",
      comisionTipo: "fija",
      comisionBase: 80,
      comisionUnidad: "eur_cups",
      vigenciaMeses: 12,
    }
    expect(formatMarcoComisionFijaUsuario(entry, 50, formatCurrency)).toBe("40.00 €")
    expect(formatMarcoComisionFijaUsuario(entry, 100, formatCurrency)).toBe("80.00 €")
  })
})

describe("estimateMarcoCommissionEur Naturgy tramos", () => {
  it("aplica comisión fija por debajo de 10 MWh", () => {
    const result = estimateMarcoCommissionEur(makeNaturgyBaseEntry(), 100, 8000, formatCurrency)
    expect(result.amountEur).toBe(96)
  })

  it("aplica €/MWh sobre consumo total a partir de 10 MWh", () => {
    const result = estimateMarcoCommissionEur(makeNaturgyBaseEntry(), 100, 15000, formatCurrency)
    expect(result.amountEur).toBe(168)
    expect(result.detail).toContain("€/MWh")
  })

  it("respeta porcentaje comercial en tramo €/MWh", () => {
    const result = estimateMarcoCommissionEur(makeNaturgyBaseEntry(), 50, 15000, formatCurrency)
    expect(result.amountEur).toBe(84)
  })
})
