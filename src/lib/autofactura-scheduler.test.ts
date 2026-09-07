import { describe, expect, it } from "vitest"
import {
  getAutofacturaPeriodoFacturacion,
  getLatestAutofacturaEmisionDate,
  getProximaFechaAutofactura,
} from "./autofactura-scheduler"

describe("getProximaFechaAutofactura", () => {
  it("devuelve día 6 del mes siguiente para residencial", () => {
    const result = getProximaFechaAutofactura("residencial", new Date(2026, 7, 15))
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(8)
    expect(result.getDate()).toBe(6)
  })

  it("devuelve día 20 del mes siguiente para pyme", () => {
    const result = getProximaFechaAutofactura("pyme", new Date(2026, 0, 10))
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(1)
    expect(result.getDate()).toBe(20)
  })
})

describe("getLatestAutofacturaEmisionDate", () => {
  it("devuelve el corte del mes actual si ya pasó", () => {
    const result = getLatestAutofacturaEmisionDate("residencial", new Date(2026, 8, 7))
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(8)
    expect(result.getDate()).toBe(6)
  })

  it("devuelve el corte del mes anterior si aún no llegó", () => {
    const result = getLatestAutofacturaEmisionDate("pyme", new Date(2026, 8, 15))
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(7)
    expect(result.getDate()).toBe(20)
  })
})

describe("getAutofacturaPeriodoFacturacion", () => {
  it("mapea la emisión de septiembre a activaciones de agosto (residencial)", () => {
    expect(getAutofacturaPeriodoFacturacion("residencial", new Date(2026, 8, 7))).toEqual({
      mes: 8,
      año: 2026,
    })
  })
})
