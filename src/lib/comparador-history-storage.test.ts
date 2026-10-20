import { describe, expect, it } from "vitest"
import {
  comparisonHistoryCanDownloadPdf,
  comparisonHistoryInvoiceTotal,
  comparisonHistorySavingsMonthly,
  comparisonHistoryToEstudioParams,
  type ComparisonHistoryEntry,
} from "./comparador-history-storage"
import { mapComparadorToEstudioAhorro } from "./pdf/map-comparador-estudio-ahorro"

const periods = { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 }

function entry(partial: Partial<ComparisonHistoryEntry>): ComparisonHistoryEntry {
  return {
    id: "comp-1",
    clientName: "Ana",
    cups: "ES0031102226267008JM",
    accessTariff: "2.0TD",
    currentAnnualExpense: 960,
    maxAnnualSavings: 120,
    bestTariffName: "One Luz",
    date: "2026-10-19",
    source: "local",
    ...partial,
  }
}

describe("comparison history pdf snapshot", () => {
  it("usa el total de la factura guardado y el ahorro mensual", () => {
    const saved = entry({
      snapshot: {
        potencias: periods,
        consumos: periods,
        preciosPotenciaActual: periods,
        preciosEnergiaActual: periods,
        preciosOferta: {},
        diasFacturacion: 30,
        rentMeterMonthly: 0,
        bonoSocial: 0,
        energiaReactiva: 0,
        otrosCostesSva: 0,
        currentBillMonthly: 79.62,
        companyName: "Endesa",
        monthlyCost: 70,
        annualCost: 840,
      },
    })

    expect(comparisonHistoryInvoiceTotal(saved)).toBeCloseTo(79.62)
    expect(comparisonHistorySavingsMonthly(saved)).toBeCloseTo(10)
  })

  it("reconstruye el PDF con el precio de la oferta guardado", () => {
    const saved = entry({
      snapshot: {
        potencias: { ...periods, p1: 4.6, p2: 4.6 },
        consumos: { ...periods, p1: 100, p2: 80, p3: 60 },
        preciosPotenciaActual: periods,
        preciosEnergiaActual: periods,
        preciosOferta: {
          P1: { energyPriceKwh: 0.12, powerPriceKwDay: 0.08 },
        },
        diasFacturacion: 30,
        rentMeterMonthly: 0,
        bonoSocial: 0,
        energiaReactiva: 0,
        otrosCostesSva: 0,
        currentBillMonthly: 80,
        companyName: "Endesa",
        monthlyCost: 60,
        annualCost: 720,
      },
    })

    const params = comparisonHistoryToEstudioParams(saved)
    expect(params?.bestOption.precios?.P1?.powerPriceKwDay).toBe(0.08)
    const estudio = mapComparadorToEstudioAhorro(params!)
    const p1 = estudio.tarifaPropuesta.terminoPotencia.find((row) => row.periodo === "P1")
    expect(p1?.precioEurDia).toBe(0.08)
    expect(p1?.total).toBeCloseTo(4.6 * 0.08 * 30)
  })

  it("respeta la fecha guardada en el pdf y no descarga una fila sin precios", () => {
    const saved = entry({
      pdfInput: {
        clienteNombre: "Ana",
        cups: "ES0031102226267008JM",
        accessTariff: "2.0TD",
        potencias: periods,
        consumos: periods,
        rentMeterMonthly: 0,
        currentBillMonthly: 40,
        fechaGeneracion: "19/10/2026, 18:40",
        bestOption: {
          companyName: "Endesa",
          tariffName: "One Luz",
          annualCost: 400,
          potenciaBreakdown: 0,
          consumoBreakdown: 0,
          rentCostAnnual: 0,
          savingsAnnual: 80,
          savingsPercentage: 16,
          precios: { P1: { energyPriceKwh: 0.09, powerPriceKwDay: 0.03 } },
        },
        summary: {
          bestTariffName: "One Luz",
          bestTariffCompany: "Endesa",
          maxAnnualSavings: 80,
          maxSavingsPercentage: 16,
          currentAnnualExpense: 480,
        },
      },
    })

    expect(comparisonHistoryToEstudioParams(saved)?.fechaGeneracion).toBe("19/10/2026, 18:40")
    expect(comparisonHistoryCanDownloadPdf(entry({ source: "at", snapshot: undefined }))).toBe(false)
  })
})
