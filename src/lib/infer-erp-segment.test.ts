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

  it("usa segment si el nombre es ambiguo", () => {
    expect(
      tariffMatchesErpAudience("PRESENCIALES SBC REPOS2", "pyme", "pyme")
    ).toBe(true)
    expect(
      tariffMatchesErpAudience("PRESENCIALES SBC REPOS2", "residencial", "pyme")
    ).toBe(false)
  })
})

describe("inferErpAudienceFromText", () => {
  it("agrupa autónomo en audiencia pyme", () => {
    expect(inferErpAudienceFromText("Tarifa autónomos 3.0")).toBe("pyme")
  })
})
