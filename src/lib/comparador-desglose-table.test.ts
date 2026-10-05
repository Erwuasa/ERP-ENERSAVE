import { describe, expect, it } from "vitest"
import { buildComparadorDesgloseTable } from "./comparador-offer-breakdown"

const emptyPeriods = { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 }

describe("buildComparadorDesgloseTable", () => {
  it("incluye 3 energía + 2 potencia en 2.0TD más total", () => {
    const rows = buildComparadorDesgloseTable({
      peaje: "2.0TD",
      potencias: { ...emptyPeriods, p1: 4.6, p2: 4.6 },
      consumos: { ...emptyPeriods, p1: 100, p2: 80, p3: 120 },
      preciosPotenciaActual: emptyPeriods,
      preciosEnergiaActual: emptyPeriods,
      preciosOferta: {
        P1: { energyPriceKwh: 0.1, powerPriceKwDay: 0.05 },
        P2: { energyPriceKwh: 0.1, powerPriceKwDay: 0.05 },
        P3: { energyPriceKwh: 0.1, powerPriceKwDay: 0 },
      },
      alquilerMensual: 0,
      totalMensualOferta: 50,
      diasFacturacion: 30,
    })

    expect(rows.filter((r) => r.kind === "energia")).toHaveLength(3)
    expect(rows.filter((r) => r.kind === "potencia")).toHaveLength(2)
    expect(rows.at(-1)?.termLabel).toBe("TOTAL CON IVA")
    expect(rows.some((r) => r.kind === "otros_no_comunes")).toBe(false)
  })

  it("agrupa reactiva, bono, alquiler e IEE en otros comunes con I.E.", () => {
    const rows = buildComparadorDesgloseTable({
      peaje: "2.0TD",
      potencias: emptyPeriods,
      consumos: emptyPeriods,
      preciosPotenciaActual: emptyPeriods,
      preciosEnergiaActual: emptyPeriods,
      preciosOferta: {},
      alquilerMensual: 1,
      bonoSocialMensual: 2,
      energiaReactivaMensual: 3,
      ieeMensualOferta: 4,
      totalMensualOferta: 20,
      diasFacturacion: 30,
    })

    const otros = rows.find((r) => r.kind === "otros_comunes")
    expect(otros?.costEur).toBe(10)
    expect(rows.some((r) => r.kind === "iee")).toBe(false)
    expect(rows.some((r) => r.kind === "alquiler")).toBe(false)
  })

  it("incluye 6 energía + 6 potencia en 3.0TD", () => {
    const rows = buildComparadorDesgloseTable({
      peaje: "3.0TD",
      potencias: { ...emptyPeriods, p1: 15, p2: 15, p3: 15, p4: 15, p5: 15, p6: 15 },
      consumos: { ...emptyPeriods, p1: 10, p2: 10, p3: 10, p4: 10, p5: 10, p6: 10 },
      preciosPotenciaActual: emptyPeriods,
      preciosEnergiaActual: emptyPeriods,
      preciosOferta: {
        P1: { energyPriceKwh: 0.1, powerPriceKwDay: 0.05 },
        P2: { energyPriceKwh: 0.1, powerPriceKwDay: 0.05 },
        P3: { energyPriceKwh: 0.1, powerPriceKwDay: 0.05 },
        P4: { energyPriceKwh: 0.1, powerPriceKwDay: 0.05 },
        P5: { energyPriceKwh: 0.1, powerPriceKwDay: 0.05 },
        P6: { energyPriceKwh: 0.1, powerPriceKwDay: 0.05 },
      },
      alquilerMensual: 0,
      totalMensualOferta: 100,
      diasFacturacion: 30,
    })

    expect(rows.filter((r) => r.kind === "energia")).toHaveLength(6)
    expect(rows.filter((r) => r.kind === "potencia")).toHaveLength(6)
  })
})
