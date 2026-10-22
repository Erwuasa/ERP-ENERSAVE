import { describe, expect, it } from "vitest"
import { buildComparadorDesgloseTable } from "@/lib/comparador-offer-breakdown"
import { resolveComparadorOfferTaxes } from "@/lib/comparador-offer-totals"
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

    const actualP1 = input.tarifaActual.terminoPotencia.find((row) => row.periodo === "P1")
    expect(actualP1?.potenciaContratadaKw).toBe(4.6)
    expect(actualP1?.precioEurDia).toBe(0.1)
    expect(actualP1?.total).toBeCloseTo(4.6 * 0.1 * 30, 6)
    const actualE1 = input.tarifaActual.terminoEnergia.find((row) => row.periodo === "P1")
    expect(actualE1?.consumoKwh).toBe(120)
    expect(actualE1?.precioEurKwh).toBe(0.2)

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

    const potencia = 4.6 * 0.08 * 30 + 4.6 * 0.04 * 30
    const energia = 120 * 0.12 + 90 * 0.11 + 150 * 0.1
    const taxes = resolveComparadorOfferTaxes({
      costeAnual: (potencia + energia + 1.84) * 12,
      potenciaAnual: potencia * 12,
      energiaAnual: energia * 12,
      alquilerAnual: 1.84 * 12,
    })
    expect(input.tarifaPropuesta.totalFactura).toBe(taxes.totalMensual)
    expect(input.tarifaPropuesta.otrosConceptos.find((row) => row.concepto === "IEE")?.total).toBe(
      taxes.ieeMensual
    )
    expect(input.tarifaPropuesta.otrosConceptos.find((row) => row.concepto === "IVA")?.total).toBe(
      taxes.ivaMensual
    )

    const desglose = buildComparadorDesgloseTable({
      peaje: "2.0TD",
      potencias: { p1: 4.6, p2: 4.6, p3: 0, p4: 0, p5: 0, p6: 0 },
      consumos: { p1: 120, p2: 90, p3: 150, p4: 0, p5: 0, p6: 0 },
      preciosPotenciaActual: { p1: 0.1, p2: 0.05, p3: 0, p4: 0, p5: 0, p6: 0 },
      preciosEnergiaActual: { p1: 0.2, p2: 0.18, p3: 0.15, p4: 0, p5: 0, p6: 0 },
      preciosOferta: {
        P1: { energyPriceKwh: 0.12, powerPriceKwDay: 0.08 },
        P2: { energyPriceKwh: 0.11, powerPriceKwDay: 0.04 },
        P3: { energyPriceKwh: 0.1, powerPriceKwDay: 0 },
      },
      alquilerMensual: 1.84,
      totalMensualOferta: taxes.totalMensual,
      totalMensualActual: null,
      ieeMensualOferta: taxes.ieeMensual,
      ivaMensualOferta: taxes.ivaMensual,
      baseImponibleMensualOferta: taxes.baseImponibleMensual,
      diasFacturacion: 30,
    })
    const p1Pdf = input.tarifaPropuesta.terminoPotencia.find((row) => row.periodo === "P1")
    const p1Tabla = desglose.find((row) => row.termLabel === "POTENCIA P1")
    expect(p1Pdf?.precioEurDia).toBe(p1Tabla?.rateEur)
    expect(p1Pdf?.total).toBe(p1Tabla?.costEur)
    expect(desglose.find((row) => row.kind === "total")?.costEur).toBe(taxes.totalMensual)
  })

  it("con el alquiler del formulario a 0 el total del PDF es el de la tarjeta, con 1,84 €", () => {
    const potencias = { p1: 4.6, p2: 4.6, p3: 0, p4: 0, p5: 0, p6: 0 }
    const consumos = { p1: 5, p2: 4, p3: 6, p4: 0, p5: 0, p6: 0 }
    const precios = {
      P1: { energyPriceKwh: 0.18, powerPriceKwDay: 0.07 },
      P2: { energyPriceKwh: 0.14, powerPriceKwDay: 0.01 },
      P3: { energyPriceKwh: 0.12, powerPriceKwDay: 0 },
    }
    const input = mapComparadorToEstudioAhorro({
      clienteNombre: "Cliente",
      cups: "ES0000000000000000AA",
      accessTariff: "2.0TD",
      potencias,
      consumos,
      diasFacturacion: 30,
      rentMeterMonthly: 0,
      currentBillMonthly: 90,
      bestOption: {
        companyName: "IMAGINA",
        tariffName: "Flex Fijo",
        annualCost: 0,
        potenciaBreakdown: 0,
        consumoBreakdown: 0,
        rentCostAnnual: 0,
        savingsAnnual: 0,
        savingsPercentage: 0,
        precios,
      },
      summary: {
        bestTariffName: "Flex Fijo",
        bestTariffCompany: "IMAGINA",
        maxAnnualSavings: 0,
        maxSavingsPercentage: 0,
        currentAnnualExpense: 90 * 12,
      },
    })

    const potencia = 4.6 * 0.07 * 30 + 4.6 * 0.01 * 30
    const energia = 5 * 0.18 + 4 * 0.14 + 6 * 0.12
    const taxes = resolveComparadorOfferTaxes({
      costeAnual: (potencia + energia + 1.84) * 12,
      potenciaAnual: potencia * 12,
      energiaAnual: energia * 12,
      alquilerAnual: 1.84 * 12,
    })

    expect(input.tarifaPropuesta.otrosConceptos.find((row) => row.concepto === "Alquiler equipo")?.total).toBe(
      1.84
    )
    expect(input.tarifaPropuesta.totalFactura).toBe(taxes.totalMensual)
    expect(input.tarifaPropuesta.otrosConceptos.find((row) => row.concepto === "IVA")?.total).toBe(
      taxes.ivaMensual
    )
    expect(input.tarifaActual.totalFactura).toBe(90)
    expect(input.tarifaActual.terminoPotencia.find((row) => row.periodo === "P1")?.potenciaContratadaKw).toBe(4.6)
    expect(input.tarifaActual.terminoEnergia.find((row) => row.periodo === "P1")?.consumoKwh).toBe(5)
    expect(input.tarifaActual.otrosConceptos.find((row) => row.concepto === "Alquiler equipo")?.total).toBe(1.84)
    expect(input.ahorroPorFacturaEur).toBeCloseTo(90 - taxes.totalMensual, 2)
  })

  it("en 3.0TD la factura actual y la oferta usan P1-P6", () => {
    const periodos = { p1: 1, p2: 1, p3: 1, p4: 1, p5: 1, p6: 1 }
    const input = mapComparadorToEstudioAhorro({
      clienteNombre: "Cliente",
      cups: "ES0000000000000000AA",
      accessTariff: "3.0TD",
      potencias: periodos,
      consumos: periodos,
      preciosPotenciaActual: periodos,
      preciosEnergiaActual: periodos,
      diasFacturacion: 30,
      rentMeterMonthly: 0,
      currentBillMonthly: 0,
      bestOption: {
        companyName: "Endesa",
        tariffName: "Pyme",
        annualCost: 0,
        potenciaBreakdown: 0,
        consumoBreakdown: 0,
        rentCostAnnual: 0,
        savingsAnnual: 0,
        savingsPercentage: 0,
        precios: {
          P1: { energyPriceKwh: 0.1, powerPriceKwDay: 0.02 },
          P2: { energyPriceKwh: 0.1, powerPriceKwDay: 0.02 },
          P3: { energyPriceKwh: 0.1, powerPriceKwDay: 0.02 },
          P4: { energyPriceKwh: 0.1, powerPriceKwDay: 0.02 },
          P5: { energyPriceKwh: 0.1, powerPriceKwDay: 0.02 },
          P6: { energyPriceKwh: 0.1, powerPriceKwDay: 0.02 },
        },
      },
      summary: {
        bestTariffName: "Pyme",
        bestTariffCompany: "Endesa",
        maxAnnualSavings: 0,
        maxSavingsPercentage: 0,
        currentAnnualExpense: 0,
      },
    })

    expect(input.tarifaActual.terminoPotencia.map((row) => row.periodo)).toEqual([
      "P1",
      "P2",
      "P3",
      "P4",
      "P5",
      "P6",
    ])
    expect(input.tarifaActual.terminoEnergia).toHaveLength(6)
    expect(input.tarifaPropuesta.terminoPotencia).toHaveLength(6)
    expect(input.tarifaActual.terminoPotencia[0]?.total).toBeCloseTo(1 * 1 * 30, 6)
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
    expect(propuesta.find((row) => row.concepto === "Costes adicionales")).toBeUndefined()
    expect(input.tarifaPropuesta.totalFactura).toBeLessThan(input.tarifaActual.totalFactura)
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
