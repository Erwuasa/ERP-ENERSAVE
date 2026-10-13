import { describe, expect, it } from "vitest"
import {
  filterMarcoTariffs,
  getWizardCompanies,
  getWizardCompanySupplyTypes,
  isMarcoEntryForSegment,
  mergeWizardTariffCatalog,
  priceOfferToWizardEntry,
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

  it("acepta la etiqueta del asistente aunque el tarifario venga en mayúsculas", () => {
    const acciona = priceOfferToWizardEntry({
      id: "tf-aire",
      compania: "ACCIONA",
      tarifa: "A TU AIRE",
      peaje: "2.0TD",
    })
    const accionaPyme = priceOfferToWizardEntry({
      id: "tf-pyme",
      compania: "ACCIONA",
      tarifa: "Empresa",
      peaje: "3.0TD",
    })
    const listed = filterMarcoTariffs({
      compania: "Acciona",
      segment: "residencial",
      tipo: "luz",
      peajeSegment: "2.0",
      catalog: [acciona, accionaPyme],
    })
    expect(listed.map((entry) => entry.tarifa)).toEqual(["A TU AIRE"])
    const on30 = filterMarcoTariffs({
      compania: "Acciona",
      segment: "residencial",
      tipo: "luz",
      peajeSegment: "3.0",
      catalog: [acciona, accionaPyme],
    })
    expect(on30.map((entry) => entry.tarifa)).toEqual(["Empresa"])
  })

  it("el marco con tramo sustituye a la misma tarifa del precio", () => {
    const price = priceOfferToWizardEntry({
      id: "precio",
      compania: "ACCIONA",
      tarifa: "Calma",
      peaje: "2.0TD",
    })
    const marco = entry({
      compania: "Acciona",
      tipo: "luz",
      segmento: "residencial",
      peaje: "2.0TD",
    })
    marco.tarifa = "Calma"
    marco.tramos = [{ desde_kwh: 0, hasta_kwh: 5000, comision_base: 40 }]
    const merged = mergeWizardTariffCatalog([marco], [price])
    expect(merged).toHaveLength(1)
    expect(merged[0]?.id).toBe(marco.id)
    expect(merged[0]?.tramos?.[0]?.comision_base).toBe(40)
  })

  it("filters luz vs gas inside the same segment", () => {
    expect(getWizardCompanies("residencial", catalog, "gas")).toEqual(["Endesa"])
    expect(getWizardCompanies("pyme", catalog, "gas")).toEqual(["Naturgy"])
    expect(getWizardCompanySupplyTypes("Endesa", "residencial", catalog)).toEqual(["luz", "gas"])
    expect(getWizardCompanySupplyTypes("Naturgy", "pyme", catalog)).toEqual(["gas"])
  })
})
