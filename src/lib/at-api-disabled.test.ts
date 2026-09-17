import { describe, expect, it } from "vitest"
import { resolveAtApiDisabledMessage } from "./at-api-disabled"

describe("resolveAtApiDisabledMessage", () => {
  it("uses a specific warning for FTP, tarifas and marcos", () => {
    expect(resolveAtApiDisabledMessage("FTP")).toMatch(/archivo de AT/i)
    expect(resolveAtApiDisabledMessage("Tarifas")).toMatch(/tarifas/i)
    expect(resolveAtApiDisabledMessage("Marco Retributivo")).toMatch(/marcos/i)
    expect(resolveAtApiDisabledMessage("Mis Clientes")).toMatch(/clientes/i)
  })

  it("falls back to a global AT pause message", () => {
    expect(resolveAtApiDisabledMessage("Dashboard")).toMatch(/pausadas/i)
    expect(resolveAtApiDisabledMessage()).toMatch(/pausadas/i)
  })
})
