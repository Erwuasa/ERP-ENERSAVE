import { describe, expect, it } from "vitest"
import {
  getWizardCompanies,
  getWizardCompanySupplyTypes,
  isMarcoEntryForSegment,
} from "./contract-tariff-filter"
import type { MarcoRetributivoEntry } from "../data/marco-retributivo-catalog"

function entry(
  patch: Pick<MarcoRetributivoEntry, "compania" | "tipo" | "segmento" | "peaje">
): MarcoRetributivoEntry {
  return {
    id: `${patch.compania}-${patch.tipo}-${patch.segmento}`,
    tarifa: "Test",
    condiciones: "",
    comisionTipo: "fija",
    comisionBase: 1,
    comisionUnidad: "eur_cups",
    vigenciaMeses: 12,
    ...patch,
  }
}

const catalog: MarcoRetributivoEntry[] = [
  entry({ compania: "Endesa", tipo: "luz", segmento: "residencial", peaje: "2.0TD" }),
  entry({ compania: "Endesa", tipo: "gas", segmento: "residencial", peaje: "RL.1" }),
  entry({ compania: "Endesa", tipo: "luz", segmento: "pyme", peaje: "3.0TD" }),
  entry({ compania: "Naturgy", tipo: "gas", segmento: "pyme", peaje: "RL.2" }),
  entry({ compania: "Adamo", tipo: "luz", segmento: "residencial", peaje: "2.0TD" }),
]

describe("contract-tariff-filter wizard companies", () => {
  it("filters residencial vs pyme", () => {
    expect(isMarcoEntryForSegment(catalog[0], "residencial")).toBe(true)
    expect(isMarcoEntryForSegment(catalog[0], "pyme")).toBe(false)
    expect(getWizardCompanies("residencial", catalog, "luz")).toEqual(["Adamo", "Endesa"])
    expect(getWizardCompanies("pyme", catalog, "luz")).toEqual(["Endesa"])
  })

  it("prioriza peaje sobre segmento mal etiquetado en marco", () => {
    const axpoPyme = entry({
      compania: "Axpo",
      tipo: "luz",
      segmento: "residencial",
      peaje: "3.0TD",
    })
    expect(isMarcoEntryForSegment(axpoPyme, "residencial")).toBe(false)
    expect(isMarcoEntryForSegment(axpoPyme, "pyme")).toBe(true)
    expect(getWizardCompanies("residencial", [axpoPyme], "luz")).toEqual([])
    expect(getWizardCompanies("pyme", [axpoPyme], "luz")).toEqual(["Axpo"])
  })

  it("excluye comercializadoras PYME-only del listado residencial aunque tengan 2.0TD", () => {
    const ignisResMislabeled = entry({
      compania: "Ignis",
      tipo: "luz",
      segmento: "residencial",
      peaje: "2.0TD",
    })
    const ignisPyme = entry({
      compania: "Ignis",
      tipo: "luz",
      segmento: "pyme",
      peaje: "3.0TD",
    })
    const iberdrolaRes = entry({
      compania: "Iberdrola",
      tipo: "luz",
      segmento: "residencial",
      peaje: "2.0TD",
    })
    const catalogMix = [ignisResMislabeled, ignisPyme, iberdrolaRes]
    expect(getWizardCompanies("residencial", catalogMix, "luz")).toEqual(["Iberdrola"])
    expect(getWizardCompanies("pyme", catalogMix, "luz")).toEqual(["Ignis"])
  })

  it("excluye Gana Energía del listado PYME", () => {
    const ganaRes = entry({
      compania: "Gana Energía",
      tipo: "luz",
      segmento: "residencial",
      peaje: "2.0TD",
    })
    const ganaPymeMislabeled = entry({
      compania: "Gana Energía",
      tipo: "luz",
      segmento: "pyme",
      peaje: "3.0TD",
    })
    expect(getWizardCompanies("pyme", [ganaPymeMislabeled], "luz")).toEqual([])
    expect(getWizardCompanies("residencial", [ganaRes], "luz")).toEqual(["Gana Energía"])
  })

  it("filters luz vs gas inside the same segment", () => {
    expect(getWizardCompanies("residencial", catalog, "gas")).toEqual(["Endesa"])
    expect(getWizardCompanies("pyme", catalog, "gas")).toEqual(["Naturgy"])
    expect(getWizardCompanySupplyTypes("Endesa", "residencial", catalog)).toEqual(["luz", "gas"])
    expect(getWizardCompanySupplyTypes("Naturgy", "pyme", catalog)).toEqual(["gas"])
  })
})
