import { describe, expect, it } from "vitest"
import {
  inferCompaniaFromTarifaOffer,
  resolveContractCompaniaForDisplay,
} from "./resolve-contract-compania"
import type { MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"

function sampleMarcoRow(overrides: Partial<MarcoRetributivoRow>): MarcoRetributivoRow {
  return {
    id: overrides.id ?? "1",
    compania: overrides.compania ?? "Endesa",
    tarifa: overrides.tarifa ?? "TEST",
    tipo: "luz",
    peaje: "2.0TD",
    segmento: "residencial",
    condicion_1: null,
    condicion_2: null,
    condiciones: null,
    comision_tipo: "fija",
    comision_base: 1,
    comision_unidad: "eur_cups",
    vigencia_meses: 12,
    fecha_inicio: "2026-01-01",
    activo: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    updated_by: null,
    energia_p1: null,
    energia_p2: null,
    energia_p3: null,
    energia_p4: null,
    energia_p5: null,
    energia_p6: null,
    potencia_p1: null,
    potencia_p2: null,
    potencia_p3: null,
    potencia_p4: null,
    potencia_p5: null,
    potencia_p6: null,
    ...overrides,
    companiaLogoUrl: overrides.companiaLogoUrl ?? null,
  }
}

describe("inferCompaniaFromTarifaOffer", () => {
  it("mapea Luz One a Naturgy", () => {
    expect(inferCompaniaFromTarifaOffer("PLAN FIJO LUZ ONE", null)).toBe("Naturgy")
  })

  it("mapea CDR a Repsol", () => {
    expect(inferCompaniaFromTarifaOffer("PRECIO FIJO CDR RESIDENCIAL", null)).toBe("Repsol")
  })

  it("mapea Precio de Mercado / residencial mercado a Gana Energía", () => {
    expect(inferCompaniaFromTarifaOffer("Precio de Mercado", null)).toBe("Gana Energía")
    expect(inferCompaniaFromTarifaOffer("RESIDENCIAL PRECIO DE MERCADO", null)).toBe(
      "Gana Energía"
    )
  })

  it("mapea presenciales SBC / L8 a Repsol", () => {
    expect(
      inferCompaniaFromTarifaOffer("PRECIO FIJO PRESENCIALES SBC REPOS2 12M L8", null)
    ).toBe("Repsol")
    expect(inferCompaniaFromTarifaOffer("OFERTA PYME L2 12M", null)).toBe("Repsol")
  })
})

describe("resolveContractCompaniaForDisplay", () => {
  it("usa inferencia cuando compania está vacía", () => {
    expect(
      resolveContractCompaniaForDisplay({
        compania: "—",
        tarifa: "Fixed Price CDR",
      })
    ).toBe("Repsol")
  })

  it("prioriza tarifa NIBA frente a compania errónea en BD", () => {
    expect(
      resolveContractCompaniaForDisplay({
        compania: "Naturgy",
        tarifa: "NIBA ZEN",
      })
    ).toBe("Niba")
  })

  it("resuelve <=15 KW USO como Naturgy", () => {
    expect(
      resolveContractCompaniaForDisplay({
        compania: "",
        tarifa: "<=15 KW  USO",
      })
    ).toBe("Naturgy")
  })

  it("no empareja Precio de Mercado con Nordy del marco si compania es Gana", () => {
    expect(
      resolveContractCompaniaForDisplay({
        compania: "Gana Energía",
        tarifa: "Precio de Mercado",
        marcoRows: [
          sampleMarcoRow({
            id: "nordy",
            compania: "Nordy",
            tarifa: "Tarifa Mercado",
          }),
        ],
      })
    ).toBe("Gana Energía")
  })

  it("prioriza CDR/V29 como Repsol aunque el marco empareje mal", () => {
    expect(
      resolveContractCompaniaForDisplay({
        compania: "Repsol",
        tarifa: "PRECIO FIJO CDR TA24HPLUS 12M V29",
        marcoRows: [
          sampleMarcoRow({
            id: "bad",
            compania: "Axpo",
            tarifa: "V29",
          }),
        ],
      })
    ).toBe("Repsol")
  })
})
