import { describe, expect, it } from "vitest"
import {
  assessComparadorTariffPricingCoverage,
  isComparadorTariffPricingComplete,
  mergeComparadorTariffPrecios,
} from "./comparador-tariff-pricing"
import type { MarcoRetributivoRow } from "./supabase/marco-retributivo"

function marcoRow(
  overrides: Partial<MarcoRetributivoRow> = {}
): MarcoRetributivoRow {
  return {
    id: "m1",
    compania: "Niba",
    tarifa: "Excedentes",
    tipo: "luz",
    peaje: "2.0TD",
    segmento: "residencial",
    condicion_1: null,
    condicion_2: null,
    condiciones: null,
    comision_tipo: "fija",
    comision_base: 30,
    comision_unidad: "eur_cups",
    vigencia_meses: 12,
    fecha_inicio: "2025-01-01",
    activo: true,
    created_at: "2025-01-01",
    updated_at: "2025-01-01",
    updated_by: null,
    energia_p1: 0.06,
    energia_p2: 0.06,
    energia_p3: 0.06,
    energia_p4: null,
    energia_p5: null,
    energia_p6: null,
    potencia_p1: null,
    potencia_p2: null,
    potencia_p3: null,
    potencia_p4: null,
    potencia_p5: null,
    potencia_p6: null,
    ...overrides,
  }
}

describe("comparador-tariff-pricing", () => {
  it("merges marco prices when catalog lacks them", () => {
    const merged = mergeComparadorTariffPrecios(
      {
        P1: { energyPriceKwh: 0.06, powerPriceKwDay: 0 },
        P2: { energyPriceKwh: 0.06, powerPriceKwDay: 0 },
        P3: { energyPriceKwh: 0.06, powerPriceKwDay: 0 },
      },
      marcoRow({ potencia_p1: 0.08, potencia_p2: 0.04 }),
      "2.0TD"
    )

    expect(merged.P1?.powerPriceKwDay).toBe(0.08)
    expect(merged.P2?.powerPriceKwDay).toBe(0.04)
    expect(merged.P1?.energyPriceKwh).toBe(0.06)
  })

  it("rejects tariffs missing potencia prices for filled periods", () => {
    const inputs = {
      potencias: { p1: 4.6, p2: 4.6, p3: null, p4: null, p5: null, p6: null },
      consumos: { p1: 120, p2: 90, p3: 150, p4: null, p5: null, p6: null },
    }

    const incomplete = isComparadorTariffPricingComplete(
      inputs,
      "2.0TD",
      {
        P1: { energyPriceKwh: 0.06, powerPriceKwDay: 0 },
        P2: { energyPriceKwh: 0.06, powerPriceKwDay: 0 },
        P3: { energyPriceKwh: 0.06, powerPriceKwDay: 0 },
      },
      null
    )

    expect(incomplete).toBe(false)

    const complete = isComparadorTariffPricingComplete(
      inputs,
      "2.0TD",
      {
        P1: { energyPriceKwh: 0.06, powerPriceKwDay: 0 },
        P2: { energyPriceKwh: 0.06, powerPriceKwDay: 0 },
        P3: { energyPriceKwh: 0.06, powerPriceKwDay: 0 },
      },
      marcoRow({ potencia_p1: 0.08, potencia_p2: 0.04 })
    )

    expect(complete).toBe(true)
  })

  it("rejects tariffs missing energia prices for filled consumo periods", () => {
    const coverage = assessComparadorTariffPricingCoverage(
      {
        potencias: { p1: 75, p2: 75, p3: 75, p4: 75, p5: 75, p6: 75 },
        consumos: { p1: 1225, p2: 1455, p3: 0, p4: 0, p5: 0, p6: 1170 },
      },
      "3.0TD",
      {
        P6: { energyPriceKwh: 0.1059, powerPriceKwDay: 0.003953 },
      }
    )

    expect(coverage.isComplete).toBe(false)
    expect(coverage.missingEnergiaPeriods).toEqual(["p1", "p2"])
  })
})
