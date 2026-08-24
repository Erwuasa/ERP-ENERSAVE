import { describe, expect, it } from "vitest"
import {
  buildMailtoHref,
  buildPeriodosMayorConsumo,
  inferTarifaPrecioTipoFromNombre,
} from "./comparador-email-helpers"
import { generarEmailPropuesta } from "./email-propuesta-generator"

describe("comparador email helpers", () => {
  it("infers indexado from tariff name", () => {
    expect(inferTarifaPrecioTipoFromNombre("Plan Online Indexado")).toBe("indexado")
    expect(inferTarifaPrecioTipoFromNombre("Tarifa Fija Hogar")).toBe("fijo")
  })

  it("picks top consumption periods", () => {
    expect(
      buildPeriodosMayorConsumo({
        p1: 1200,
        p2: 900,
        p3: 1500,
        p4: 0,
        p5: 0,
        p6: 0,
      })
    ).toEqual(["P3 (valle)", "P1 (punta)"])
  })

  it("builds mailto href with encoded subject and body", () => {
    const href = buildMailtoHref("cliente@test.com", "Asunto prueba", "Hola\nMundo")
    expect(href.startsWith("mailto:cliente%40test.com?")).toBe(true)
    expect(href).toContain("subject=Asunto+prueba")
    expect(href).toContain("body=Hola")
  })
})

describe("generarEmailPropuesta", () => {
  it("returns fallback email when Gemini is not configured", async () => {
    const result = await generarEmailPropuesta({
      clienteNombre: "Ferretería García",
      contactoNombre: "Ana García",
      empresaNombre: "Ferretería García S.L.",
      tarifaActual: { compania: "Endesa", tipo: "fijo" },
      tarifaPropuesta: { compania: "Iberdrola", tipo: "indexado" },
      ahorroAnualEur: 420,
      ahorroPct: 12,
      periodosMayorConsumo: ["P1 (punta)", "P3 (valle)"],
    })

    expect(result.asunto).toContain("Iberdrola")
    expect(result.cuerpo).toContain("Equipo ENerSave")
    expect(result.cuerpo).toContain("420")
  })
})
