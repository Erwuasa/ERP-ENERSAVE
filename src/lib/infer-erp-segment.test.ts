import { describe, expect, it } from "vitest"
import {
  inferErpAudienceFromText,
  inferMarcoSegmentoFromText,
  tariffMatchesErpAudience,
} from "./infer-erp-segment"

describe("inferMarcoSegmentoFromText", () => {
  it("detecta residencial por RES / hogar", () => {
    expect(inferMarcoSegmentoFromText("Tarifa Sin Horarios Hogar 2.0TD_PB RES <10KW")).toBe(
      "residencial"
    )
    expect(inferMarcoSegmentoFromText("Tarifa 2ª Residencia <10KW")).toBe("residencial")
  })

  it("detecta pyme por empresa / negocios", () => {
    expect(inferMarcoSegmentoFromText("Tarifa Empresa 3.0 ESTANDAR L2")).toBe("pyme")
    expect(inferMarcoSegmentoFromText("PYME indexada 3.0TD")).toBe("pyme")
  })

  it("no confunde REPOS con RES", () => {
    expect(inferMarcoSegmentoFromText("PRECIO FIJO PRESENCIALES SBC REPOS2 12M L8")).toBeNull()
  })
})

describe("tariffMatchesErpAudience", () => {
  it("prioriza el nombre sobre segment almacenado", () => {
    expect(
      tariffMatchesErpAudience("Tarifa Empresa 3.0", "residencial", "pyme")
    ).toBe(true)
    expect(
      tariffMatchesErpAudience("Tarifa Hogar RES", "pyme", "residencial")
    ).toBe(true)
  })

  it("usa segment si el nombre es ambiguo y no hay tarifa de acceso", () => {
    expect(
      tariffMatchesErpAudience("PRESENCIALES SBC REPOS2", "pyme", "pyme")
    ).toBe(true)
    expect(
      tariffMatchesErpAudience("PRESENCIALES SBC REPOS2", "residencial", "pyme")
    ).toBe(false)
  })

  it("usa la tarifa de acceso antes que el segment guardado (bug Naturgy Pymes)", () => {
    // enertech_precios.segment llega siempre "residencial" del sync (AGENTS.md §8); sin la
    // tarifa de acceso como respaldo, cualquier fila pyme sin "pyme"/"empresa" en el nombre
    // desaparecía del filtro "pyme" aunque fuera una 3.0TD/6.1TD real.
    expect(
      tariffMatchesErpAudience("ENDESA", "residencial", "pyme", "", "3.0TD")
    ).toBe(true)
    expect(
      tariffMatchesErpAudience("ENDESA", "residencial", "residencial", "", "2.0TD")
    ).toBe(true)
    expect(
      tariffMatchesErpAudience("ENDESA", "residencial", "pyme", "", "2.0TD")
    ).toBe(false)
  })

  it("el nombre comercial sigue ganando aunque la tarifa de acceso diga lo contrario", () => {
    expect(
      tariffMatchesErpAudience("NATURGY PYMES", "residencial", "pyme", "", "2.0TD")
    ).toBe(true)
    expect(
      tariffMatchesErpAudience("NATURGY RESIDENCIAL", "residencial", "residencial", "", "3.0TD")
    ).toBe(true)
  })
})

describe("inferErpAudienceFromText", () => {
  it("agrupa autónomo en audiencia pyme", () => {
    expect(inferErpAudienceFromText("Tarifa autónomos 3.0")).toBe("pyme")
  })
})
