import { describe, expect, it } from "vitest"
import { canRetrySinDatos, nextSipsPollDelaySeconds, sinDatosRetryAt } from "./polling"

describe("nextSipsPollDelaySeconds", () => {
  it("honours the suggested delay with a floor", () => {
    expect(nextSipsPollDelaySeconds(1, 30)).toBe(30)
    expect(nextSipsPollDelaySeconds(1, 1)).toBe(5)
  })

  it("stops after the max attempts", () => {
    expect(nextSipsPollDelaySeconds(4, 30)).toBeNull()
  })
})

describe("sin_datos cooldown", () => {
  const consulted = new Date("2026-10-06T10:00:00Z")

  it("allows a real retry only after 24 h", () => {
    expect(sinDatosRetryAt(consulted).toISOString()).toBe("2026-10-07T10:00:00.000Z")
    expect(canRetrySinDatos(consulted, new Date("2026-10-07T09:59:00Z"))).toBe(false)
    expect(canRetrySinDatos(consulted, new Date("2026-10-07T10:00:00Z"))).toBe(true)
  })
})
