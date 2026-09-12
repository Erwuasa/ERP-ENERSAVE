import { describe, expect, it } from "vitest"
import {
  buildComparadorOfferBreakdown,
} from "./comparador-offer-breakdown"
import {
  calcularCosteComparadorMensual,
  COMPARADOR_DIAS_FACTURACION_MENSUAL,
  potenciaPeriodCostMensual,
} from "./comparador-billing"

describe("comparador-billing", () => {
  it("calculates potencia as kW × €/kW·día × días (mensual)", () => {
    const cost = potenciaPeriodCostMensual(75, 0.055824, 31)
    expect(cost).toBeCloseTo(129.79, 1)
  })

  it("calculates monthly energy from kWh/mes × €/kWh", () => {
    const breakdown = calcularCosteComparadorMensual(
      [75, 75, 75, 75, 75, 75],
      [1225, 1455, 0, 0, 0, 1170],
      [0.055824, 0.029092, 0.012275, 0.010645, 0.006886, 0.003953],
      [0, 0, 0, 0, 0, 0.1059],
      "3.0TD",
      8.13,
      { diasFacturacion: 31 }
    )

    expect(breakdown.potenciaMensual).toBeGreaterThan(250)
    expect(breakdown.energiaMensual).toBeCloseTo(1170 * 0.1059, 1)
    expect(breakdown.totalMensual).toBe(
      breakdown.potenciaMensual +
        breakdown.energiaMensual +
        breakdown.alquilerMensual +
        breakdown.extrasMensual
    )
    expect(breakdown.totalAnual).toBe(breakdown.totalMensual * 12)
  })

  it("includes bono social in monthly extras", () => {
    const breakdown = calcularCosteComparadorMensual(
      [4.6, 4.6, 0, 0, 0, 0],
      [120, 90, 150, 0, 0, 0],
      [0.08, 0.04, 0, 0, 0, 0],
      [0.06, 0.06, 0.06, 0, 0, 0],
      "2.0TD",
      1.84,
      { bonoSocial: 0.38, diasFacturacion: 31 }
    )

    expect(breakdown.extrasMensual).toBeCloseTo(0.38, 2)
    expect(breakdown.totalMensual).toBeGreaterThan(breakdown.potenciaMensual + breakdown.energiaMensual)
  })
})

describe("buildComparadorOfferBreakdown", () => {
  it("only includes periods with real offer prices", () => {
    const rows = buildComparadorOfferBreakdown({
      peaje: "3.0TD",
      potencias: { p1: 75, p2: 75, p3: 75, p4: 75, p5: 75, p6: 75 },
      consumos: { p1: 1225, p2: 1455, p3: 0, p4: 0, p5: 0, p6: 1170 },
      preciosPotenciaActual: { p1: 0.05, p2: 0.03, p3: 0.01, p4: 0.01, p5: 0.01, p6: 0.01 },
      preciosEnergiaActual: { p1: 0.12, p2: 0.11, p3: 0, p4: 0, p5: 0, p6: 0.1 },
      preciosOferta: {
        P1: { energyPriceKwh: 0.12, powerPriceKwDay: 0.05 },
        P2: { energyPriceKwh: 0.11, powerPriceKwDay: 0.03 },
        P6: { energyPriceKwh: 0.1059, powerPriceKwDay: 0.003953 },
      },
      alquilerMensual: 8.13,
      extrasMensual: 0,
      totalMensualOferta: 289,
      totalMensualActual: 1226,
      diasFacturacion: COMPARADOR_DIAS_FACTURACION_MENSUAL,
    })

    const energyRows = rows.filter((row) => row.kind === "energia")
    expect(energyRows.map((row) => row.id)).toEqual(["ene-p1", "ene-p2", "ene-p6"])
    expect(energyRows[0]?.labelLeft).toContain("kWh/mes")
  })

  it("shows potencia formula with billing days", () => {
    const rows = buildComparadorOfferBreakdown({
      peaje: "3.0TD",
      potencias: { p1: 75, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 },
      consumos: { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 },
      preciosPotenciaActual: { p1: 0.05, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 },
      preciosEnergiaActual: { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 },
      preciosOferta: {
        P1: { energyPriceKwh: 0, powerPriceKwDay: 0.055824 },
      },
      alquilerMensual: 0,
      extrasMensual: 0,
      totalMensualOferta: 130,
      totalMensualActual: null,
      diasFacturacion: 31,
    })

    const potRow = rows.find((row) => row.kind === "potencia")
    expect(potRow?.labelLeft).toContain("31 días")
    expect(potRow?.labelLeft).toContain("€/kW·día")
    expect(potRow?.amountOffer).toBeCloseTo(129.79, 0)
  })
})
