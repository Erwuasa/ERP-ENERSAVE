import { describe, expect, it } from "vitest"
import {
  mapRankingToOfferOptions,
  resolveComparadorCurrentAnnualExpense,
} from "./comparador-en-vivo-form"
import { emptyComparadorPeriodValues } from "./comparador-periods"

describe("resolveComparadorCurrentAnnualExpense", () => {
  it("adds rent, reactive energy and other SVA costs to current bill", () => {
    const total = resolveComparadorCurrentAnnualExpense(
      80,
      [{ id: "1", annualCost: 900 } as never],
      {
        rentMeterMonthly: 1.84,
        bonoSocial: 0.5,
        energiaReactiva: 50,
        otrosCostesSva: 30,
      }
    )

    expect(total).toBe(80 * 12 + 1.84 * 12 + 0.5 * 12 + 50 + 30)
  })

  it("uses exact current bill prices in ranking savings when provided", () => {
    const potencias = { p1: 5, p2: 5, p3: 5, p4: 0, p5: 0, p6: 0 }
    const consumos = { p1: 1000, p2: 900, p3: 1100, p4: 0, p5: 0, p6: 0 }
    const preciosPotencia = { p1: 0.07, p2: 0.03, p3: 0.01, p4: 0, p5: 0, p6: 0 }
    const preciosEnergia = { p1: 0.2, p2: 0.18, p3: 0.16, p4: 0, p5: 0, p6: 0 }

    const mapped = mapRankingToOfferOptions({
      resultados: [
        {
          tariffId: "t1",
          providerName: "A",
          tariffName: "Tarifa",
          costeAnual: 500,
          potenciaAnual: 100,
          energiaAnual: 300,
          comisionEstimada: null,
          atRateId: null,
          isIndexed: false,
          svaPriceMonthly: null,
          potenciaBoe: null,
        },
      ],
      peaje: "2.0TD",
      potencias,
      consumos,
      preciosPotenciaActual: preciosPotencia,
      preciosEnergiaActual: preciosEnergia,
      currentBillMonthly: 85,
      billExtras: { rentMeterMonthly: 1.84, bonoSocial: 0, energiaReactiva: 0, otrosCostesSva: 0 },
      diasFacturacion: 30,
      sortMode: "ahorro",
    })

    expect(mapped.currentBillPrecision).toBe("exacto")
    expect(mapped.options[0]?.savingsAnnual).toBeGreaterThan(0)
  })

  it("keeps estimated savings when actual prices are missing", () => {
    const mapped = mapRankingToOfferOptions({
      resultados: [
        {
          tariffId: "t1",
          providerName: "A",
          tariffName: "Tarifa",
          costeAnual: 500,
          potenciaAnual: 100,
          energiaAnual: 300,
          comisionEstimada: null,
          atRateId: null,
          isIndexed: false,
          svaPriceMonthly: null,
          potenciaBoe: null,
        },
      ],
      peaje: "2.0TD",
      potencias: { p1: 4.6, p2: 4.6, p3: 0, p4: 0, p5: 0, p6: 0 },
      consumos: { p1: 1000, p2: 800, p3: 1200, p4: 0, p5: 0, p6: 0 },
      preciosPotenciaActual: emptyComparadorPeriodValues(),
      preciosEnergiaActual: emptyComparadorPeriodValues(),
      currentBillMonthly: 80,
      billExtras: { rentMeterMonthly: 1.84, bonoSocial: 0, energiaReactiva: 0, otrosCostesSva: 0 },
      diasFacturacion: 30,
      sortMode: "ahorro",
    })

    expect(mapped.currentBillPrecision).toBe("estimado")
  })
})
