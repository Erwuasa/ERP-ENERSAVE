import { describe, expect, it } from "vitest"
import {
  canCalcularCosteActualExacto,
  resolveComparadorCurrentBillAnnual,
} from "./comparador-current-bill"
import { emptyComparadorPeriodValues } from "./comparador-periods"

describe("comparador-current-bill", () => {
  it("detects when all active periods have matching actual prices", () => {
    const potencias = { p1: 4.6, p2: 4.6, p3: 0, p4: 0, p5: 0, p6: 0 }
    const consumos = { p1: 1000, p2: 800, p3: 1200, p4: 0, p5: 0, p6: 0 }
    const preciosPotencia = { p1: 0.08, p2: 0.04, p3: 0, p4: 0, p5: 0, p6: 0 }
    const preciosEnergia = { p1: 0.15, p2: 0.12, p3: 0.1, p4: 0, p5: 0, p6: 0 }

    expect(
      canCalcularCosteActualExacto("2.0TD", potencias, consumos, preciosPotencia, preciosEnergia)
    ).toBe(true)
  })

  it("calculates exact current bill from actual period prices", () => {
    const potencias = { p1: 5, p2: 5, p3: 5, p4: 0, p5: 0, p6: 0 }
    const consumos = { p1: 1000, p2: 900, p3: 1100, p4: 0, p5: 0, p6: 0 }
    const preciosPotencia = { p1: 0.07, p2: 0.03, p3: 0.01, p4: 0, p5: 0, p6: 0 }
    const preciosEnergia = { p1: 0.2, p2: 0.18, p3: 0.16, p4: 0, p5: 0, p6: 0 }

    const result = resolveComparadorCurrentBillAnnual({
      peaje: "2.0TD",
      potencias,
      consumos,
      preciosPotenciaActual: preciosPotencia,
      preciosEnergiaActual: preciosEnergia,
      currentBillMonthly: 85,
      billExtras: { rentMeterMonthly: 1.84, bonoSocial: 0, energiaReactiva: 0, otrosCostesSva: 0 },
      diasFacturacion: 30,
      fallbackOptions: [],
    })

    expect(result.precision).toBe("exacto")
    expect(result.totalAnual).toBeGreaterThan(0)
  })

  it("falls back to estimated bill when prices are incomplete", () => {
    const result = resolveComparadorCurrentBillAnnual({
      peaje: "2.0TD",
      potencias: { p1: 4.6, p2: 4.6, p3: 0, p4: 0, p5: 0, p6: 0 },
      consumos: { p1: 1000, p2: 800, p3: 1200, p4: 0, p5: 0, p6: 0 },
      preciosPotenciaActual: emptyComparadorPeriodValues(),
      preciosEnergiaActual: emptyComparadorPeriodValues(),
      currentBillMonthly: 80,
      billExtras: { rentMeterMonthly: 1.84, bonoSocial: 0.4, energiaReactiva: 10, otrosCostesSva: 5 },
      diasFacturacion: 31,
      fallbackOptions: [{ id: "1", annualCost: 900 } as never],
    })

    expect(result.precision).toBe("estimado")
    expect(result.totalAnual).toBe(80 * 12 + 1.84 * 12 + 0.4 * 12 + 10 + 5)
  })
})
