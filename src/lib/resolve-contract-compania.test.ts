import { describe, expect, it } from "vitest"
import {
  inferCompaniaFromTarifaOffer,
  resolveContractCompaniaForDisplay,
} from "./resolve-contract-compania"

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
          {
            id: "nordy",
            compania: "Nordy",
            tarifa: "Tarifa Mercado",
            tipo: "luz",
            peaje: "2.0TD",
            condiciones: "",
            comisionTipo: "fija",
            comisionBase: 1,
            comisionUnidad: "eur_cups",
            vigenciaMeses: 12,
          },
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
          {
            id: "bad",
            compania: "Axpo",
            tarifa: "V29",
            tipo: "luz",
            peaje: "2.0TD",
            condiciones: "",
            comisionTipo: "fija",
            comisionBase: 1,
            comisionUnidad: "eur_cups",
            vigenciaMeses: 12,
          },
        ],
      })
    ).toBe("Repsol")
  })
})
