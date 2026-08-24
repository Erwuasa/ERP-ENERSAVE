import { describe, expect, it } from "vitest"
import { getProximaFechaAutofactura } from "./autofactura-scheduler"

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
