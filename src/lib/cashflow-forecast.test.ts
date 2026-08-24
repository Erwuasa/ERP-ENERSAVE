import { describe, expect, it } from "vitest"
import {
  calcularCashflow16Semanas,
  COBRO_COMERCIALIZADORA_DIA_RESIDENCIAL,
  estimateFechaCobroComercializadora,
  estimateFechaPagoComercial,
  PAGO_COMERCIAL_DIA_RESIDENCIAL,
} from "./cashflow-forecast"
import type { Settlement } from "../types/settlement"

const HOY = new Date(2026, 1, 10) // 10 feb 2026 (martes)

function settlement(partial: Partial<Settlement> & Pick<Settlement, "id">): Settlement {
  return {
    comercialId: "usr-3",
    comercialName: "Ignacio Ortiz",
    montoInterno: 0,
    montoExterno: 0,
    estado: "pendiente",
    tipo: "luz",
    descripcion: "Liquidación test",
    createdAt: "2026-01-15",
    ...partial,
  }
}

describe("estimateFechaCobroComercializadora", () => {
  it("usa día 9 residencial del mes siguiente", () => {
    const fecha = estimateFechaCobroComercializadora(
      settlement({ id: "s1", createdAt: "2026-01-20" })
    )
    expect(fecha).toBe(`2026-02-${String(COBRO_COMERCIALIZADORA_DIA_RESIDENCIAL).padStart(2, "0")}`)
  })
})

describe("estimateFechaPagoComercial", () => {
  it("usa día 6 residencial del mes siguiente", () => {
    const fecha = estimateFechaPagoComercial(settlement({ id: "s2", createdAt: "2026-01-20" }))
    expect(fecha).toBe(`2026-02-${String(PAGO_COMERCIAL_DIA_RESIDENCIAL).padStart(2, "0")}`)
  })
})

describe("calcularCashflow16Semanas", () => {
  it("encadena saldoFinal de la semana N con saldoInicial de la semana N+1", () => {
    const semanas = calcularCashflow16Semanas(
      10_000,
      [
        settlement({
          id: "cobro-1",
          montoInterno: 5_000,
          descripcion: "Cobro Repsol enero",
          createdAt: "2026-01-12",
        }),
      ],
      [
        settlement({
          id: "pago-1",
          montoExterno: 2_000,
          descripcion: "Liquidación Ignacio enero",
          createdAt: "2026-01-12",
        }),
      ],
      [],
      HOY
    )

    expect(semanas).toHaveLength(16)

    for (let i = 0; i < semanas.length - 1; i += 1) {
      expect(semanas[i + 1].saldoInicial).toBeCloseTo(semanas[i].saldoFinal, 2)
    }
  })

  it("ancla saldoActual en la semana que contiene hoy", () => {
    const saldoActual = 42_500
    const semanas = calcularCashflow16Semanas(saldoActual, [], [], [], HOY)
    const current = semanas.find(
      (semana) => semana.fechaInicio <= "2026-02-10" && semana.fechaFin >= "2026-02-10"
    )
    expect(current).toBeDefined()
    expect(current?.saldoInicial).toBeCloseTo(saldoActual, 2)
  })

  it("marca semanas pasadas como no proyección", () => {
    const semanas = calcularCashflow16Semanas(0, [], [], [], HOY)
    const pasadas = semanas.filter((semana) => semana.fechaFin < "2026-02-10")
    expect(pasadas.length).toBeGreaterThan(0)
    expect(pasadas.every((semana) => semana.esProyeccion === false)).toBe(true)
  })

  it("registra settlements pagados en semanas históricas", () => {
    const semanas = calcularCashflow16Semanas(
      20_000,
      [],
      [],
      [],
      HOY,
      {
        settlementsPagados: [
          settlement({
            id: "pagado-1",
            estado: "pagado",
            montoInterno: 3_000,
            createdAt: "2026-02-03",
          }),
        ],
      }
    )

    const semanaConCobro = semanas.find((semana) =>
      semana.entradas.some((entrada) => entrada.importe === 3_000)
    )
    expect(semanaConCobro).toBeDefined()
    expect(semanaConCobro?.esProyeccion).toBe(false)
  })
})
