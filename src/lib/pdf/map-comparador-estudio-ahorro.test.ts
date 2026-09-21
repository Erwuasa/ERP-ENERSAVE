import { describe, expect, it } from "vitest"
import { mapComparadorToEstudioAhorro } from "./map-comparador-estudio-ahorro"

describe("mapComparadorToEstudioAhorro", () => {
  it("usa kW × €/kW·día × días en cada periodo de potencia", () => {
    const input = mapComparadorToEstudioAhorro({
      clienteNombre: "Yerman",
      cups: "ES0000000000000000AA",
      accessTariff: "2.0TD",
      potencias: { p1: 4.6, p2: 4.6, p3: 0, p4: 0, p5: 0, p6: 0 },
      consumos: { p1: 120, p2: 90, p3: 150, p4: 0, p5: 0, p6: 0 },
      preciosPotenciaActual: { p1: 0.1, p2: 0.05, p3: 0, p4: 0, p5: 0, p6: 0 },
      preciosEnergiaActual: { p1: 0.2, p2: 0.18, p3: 0.15, p4: 0, p5: 0, p6: 0 },
      diasFacturacion: 30,
      rentMeterMonthly: 1.84,
      currentBillMonthly: 0,
      bestOption: {
        companyName: "Endesa",
        tariffName: "One Luz",
        annualCost: 0,
        potenciaBreakdown: 0,
        consumoBreakdown: 0,
        rentCostAnnual: 0,
        savingsAnnual: 0,
        savingsPercentage: 0,
        precios: {
          P1: { energyPriceKwh: 0.12, powerPriceKwDay: 0.08 },
          P2: { energyPriceKwh: 0.11, powerPriceKwDay: 0.04 },
          P3: { energyPriceKwh: 0.1, powerPriceKwDay: 0 },
        },
      },
      summary: {
        bestTariffName: "One Luz",
        bestTariffCompany: "Endesa",
        maxAnnualSavings: 0,
        maxSavingsPercentage: 0,
        currentAnnualExpense: 0,
      },
    })

    const p1 = input.tarifaPropuesta.terminoPotencia.find((row) => row.periodo === "P1")
    expect(p1?.potenciaContratadaKw).toBe(4.6)
    expect(p1?.precioEurDia).toBe(0.08)
    expect(p1?.total).toBeCloseTo(4.6 * 0.08 * 30, 6)

    const e1 = input.tarifaPropuesta.terminoEnergia.find((row) => row.periodo === "P1")
    expect(e1?.total).toBeCloseTo(120 * 0.12, 6)

    expect(input.tarifaPropuesta.terminoPotencia).toHaveLength(2)
    expect(input.tarifaPropuesta.terminoEnergia).toHaveLength(3)
    expect(input.tarifaPropuesta.totalFactura).toBeCloseTo(
      4.6 * 0.08 * 30 + 4.6 * 0.04 * 30 + 120 * 0.12 + 90 * 0.11 + 150 * 0.1 + 1.84,
      4
    )
    expect(input.ahorroAnualEur).toBeCloseTo(input.ahorroPorFacturaEur * 12, 4)
  })
})
