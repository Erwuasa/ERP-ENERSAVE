import { describe, expect, it } from "vitest"
import { isDynamicImportFailure } from "./lazy-route-loader"

describe("isDynamicImportFailure", () => {
  it("detecta el error típico de Vite en producción", () => {
    expect(
      isDynamicImportFailure(
        new TypeError(
          "Failed to fetch dynamically imported module: https://erp-enersave.vercel.app/assets/clientes-Br3T7Y4S.js"
        )
      )
    ).toBe(true)
  })

  it("ignora errores de lógica de aplicación", () => {
    expect(isDynamicImportFailure(new Error("Cannot read properties of undefined"))).toBe(false)
  })
})
