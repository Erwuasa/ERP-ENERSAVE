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
    expect(input.tarifaPropuesta.totalFactura).toBeGreaterThan(
      4.6 * 0.08 * 30 + 4.6 * 0.04 * 30 + 120 * 0.12 + 90 * 0.11 + 150 * 0.1 + 1.84
    )
    expect(input.ahorroAnualEur).toBeCloseTo(input.ahorroPorFacturaEur * 12, 4)
  })

  it("mapea otros conceptos del comparador a las filas del PDF", () => {
    const input = mapComparadorToEstudioAhorro({
      clienteNombre: "Cliente",
      cups: "ES0000000000000000AA",
      accessTariff: "2.0TD",
      potencias: { p1: 4.6, p2: 4.6, p3: 0, p4: 0, p5: 0, p6: 0 },
      consumos: { p1: 100, p2: 80, p3: 120, p4: 0, p5: 0, p6: 0 },
      preciosPotenciaActual: { p1: 0.1, p2: 0.05, p3: 0, p4: 0, p5: 0, p6: 0 },
      preciosEnergiaActual: { p1: 0.2, p2: 0.18, p3: 0.15, p4: 0, p5: 0, p6: 0 },
      diasFacturacion: 30,
      rentMeterMonthly: 1.5,
      bonoSocial: 0.4,
      energiaReactiva: 2.2,
      otrosCostesSva: 3.1,
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

    const actual = input.tarifaActual.otrosConceptos
    expect(actual.find((row) => row.concepto === "Alquiler equipo")?.total).toBe(1.5)
    expect(actual.find((row) => row.concepto === "Bono social")?.total).toBe(0.4)
    expect(actual.find((row) => row.concepto === "Excesos")?.total).toBe(2.2)
    expect(actual.find((row) => row.concepto === "Costes adicionales")?.total).toBe(3.1)

    const propuesta = input.tarifaPropuesta.otrosConceptos
    expect(propuesta.find((row) => row.concepto === "Alquiler equipo")?.total).toBe(1.5)
    expect(propuesta.find((row) => row.concepto === "Bono social")?.total).toBe(0.4)
    expect(propuesta.find((row) => row.concepto === "Excesos")?.total).toBe(2.2)
    expect(propuesta.find((row) => row.concepto === "Costes adicionales")?.total).toBe(3.1)
    expect(propuesta.find((row) => row.concepto === "IEE")?.total).toBeGreaterThan(0)
    expect(propuesta.find((row) => row.concepto === "IVA")?.total).toBeGreaterThan(0)
  })

  it("no incluye comisión comercial en el payload del PDF", () => {
    const input = mapComparadorToEstudioAhorro({
      clienteNombre: "Cliente",
      cups: "ES0000000000000000AA",
      accessTariff: "2.0TD",
      potencias: { p1: 4.6, p2: 4.6, p3: 0, p4: 0, p5: 0, p6: 0 },
      consumos: { p1: 100, p2: 80, p3: 120, p4: 0, p5: 0, p6: 0 },
      diasFacturacion: 30,
      rentMeterMonthly: 0,
      currentBillMonthly: 80,
      bestOption: {
        companyName: "Endesa",
        tariffName: "One Luz",
        annualCost: 900,
        potenciaBreakdown: 120,
        consumoBreakdown: 600,
        rentCostAnnual: 0,
        savingsAnnual: 120,
        savingsPercentage: 10,
        precios: {
          P1: { energyPriceKwh: 0.12, powerPriceKwDay: 0.08 },
        },
      },
      summary: {
        bestTariffName: "One Luz",
        bestTariffCompany: "Endesa",
        maxAnnualSavings: 120,
        maxSavingsPercentage: 10,
        currentAnnualExpense: 1020,
      },
    })

    const serialized = JSON.stringify(input).toLowerCase()
    expect(serialized).not.toMatch(/comisi/)
    expect(serialized).not.toMatch(/commission/)
  })
})
