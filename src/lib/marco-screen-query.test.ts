import { describe, expect, it } from "vitest"
import {
  campaniaIlikeClauses,
  collapseLuzTariffStubs,
  companyIlikePattern,
  marcoCompanyRowCounts,
  marcoPageCount,
  marcoPageSlice,
  mergeMarcoCompanies,
  tariffMatchesMarcoScreen,
  toggleChipFilter,
} from "./marco-screen-query"

describe("marco screen query", () => {
  it("quita el filtro si se pulsa el que ya está activo", () => {
    expect(toggleChipFilter("residencial", "residencial", "todos")).toBe("todos")
    expect(toggleChipFilter("todos", "residencial", "todos")).toBe("residencial")
    expect(toggleChipFilter("luz", "luz", "todos")).toBe("todos")
    expect(toggleChipFilter("Todos", "Todos", "Todos")).toBe("Todos")
    expect(toggleChipFilter("NATURGY PYMES", "NATURGY PYMES", "Todos")).toBe("Todos")
  })

  it("pagina compañías y tarifas", () => {
    expect(marcoPageCount(0, 4)).toBe(1)
    expect(marcoPageCount(5, 4)).toBe(2)
    expect(marcoPageSlice(["a", "b", "c", "d", "e"], 1, 4)).toEqual(["e"])
  })

  it("une Opción y NEON del tarifario con la compañía que tiene la comisión", () => {
    const merged = mergeMarcoCompanies(
      [
        { nombre: "OPCIÓN ENERGÍA", id: 7, logoUrl: "https://logo" },
        { nombre: "NEÓN", id: 8, logoUrl: null },
        { nombre: "GANA ENERGIA", id: 9, logoUrl: null },
      ],
      ["OPCION ENERGIA", "NEON", "GANA ENERGIA"]
    )
    const opcion = merged.find((row) => row.nombre === "OPCION ENERGIA")
    const neon = merged.find((row) => row.nombre === "NEON")
    expect(opcion?.companyIds).toEqual([7])
    expect(opcion?.logoUrl).toBe("https://logo")
    expect(neon?.companyIds).toEqual([8])
    expect(merged.filter((row) => row.nombre.includes("GANA"))).toHaveLength(1)
  })

  it("deja fuera comercializadoras sin tarifas de luz", () => {
    const merged = mergeMarcoCompanies(
      [
        { nombre: "EPC-PLACAS SOLARES", id: 1 },
        { nombre: "ADHERIDOS COMUNIDAD SOLAR", id: 2 },
        { nombre: "NORDY", id: 3 },
        { nombre: "ENDESA", id: 4, logoUrl: "https://endesa" },
      ],
      ["ENDESA", "NORDY PYMES"]
    )
    expect(merged.map((row) => row.nombre)).toEqual(["ENDESA", "NORDY PYMES"])
    expect(merged.find((row) => row.nombre === "ENDESA")?.companyIds).toEqual([4])
    expect(merged.find((row) => row.nombre === "NORDY PYMES")?.companyIds).toEqual([3])
  })

  it("arma un patrón que no mezcla Naturgy Pymes con Residencial", () => {
    expect(companyIlikePattern("NATURGY PYMES")).toBe("%naturgy%pymes%")
    expect(companyIlikePattern("Gana Energía")).toBe("%gana%")
    expect(companyIlikePattern("OPCIÓN ENERGÍA")).toBe("%opcion%")
  })

  it("busca la campaña con y sin el código de año", () => {
    expect(campaniaIlikeClauses(["FIJA LABORAL 20269 MAX"])).toEqual([
      'payload->>campania.ilike."FIJA LABORAL 20269 MAX%"',
      'payload->>campania.ilike."FIJA LABORAL MAX"',
      'payload->>campania.ilike."laboral"',
    ])
  })

  it("cuenta una sola vez la misma tarifa repetida por territorio", () => {
    const payload = {
      comercializadora: "GANA ENERGIA",
      campania: "Tarifa 24 horas",
      tarifa: "2.0TD",
      e1: 0.12,
      p1: 0.08,
    }
    const stubs = collapseLuzTariffStubs([
      { payload: { ...payload, territorio: "peninsula" }, segment: "residencial" },
      { payload: { ...payload, territorio: "canarias" }, segment: "residencial" },
      { payload: { ...payload, e1: 0.2, territorio: "peninsula" }, segment: "residencial" },
      { payload: { comercializadora: "GANA ENERGIA", campania: "Gas", tarifa: "RL1" }, segment: "residencial" },
    ])
    expect(stubs).toHaveLength(2)
    expect(stubs.every((stub) => stub.providerName === "GANA ENERGIA")).toBe(true)
  })

  it("cuenta las tarifas de cada compañía y respeta el peaje", () => {
    const stubs = [
      { providerName: "NEÓN", name: "Aire", accessTariff: "2.0TD", segment: "residencial", supplyType: "luz" },
      { providerName: "NEON", name: "Aire", accessTariff: "3.0TD", segment: "residencial", supplyType: "luz" },
      { providerName: "GANA ENERGIA", name: "Tarifa 24 horas", accessTariff: "2.0TD", segment: "residencial", supplyType: "luz" },
    ]
    const all = marcoCompanyRowCounts(["NEON", "GANA ENERGIA"], stubs, {
      tipo: "luz",
      segmento: "todos",
      peaje: "todos",
    })
    expect(all.NEON).toBe(2)
    expect(all["GANA ENERGIA"]).toBe(1)
    expect(all.Todos).toBe(3)

    const peaje = marcoCompanyRowCounts(["NEON", "GANA ENERGIA"], stubs, {
      tipo: "luz",
      segmento: "todos",
      peaje: "3.0TD",
    })
    expect(peaje.NEON).toBe(1)
    expect(peaje["GANA ENERGIA"]).toBe(0)
    expect(peaje.Todos).toBe(1)
  })

  it("filtra por peaje y segmento sin repetir la compañía equivocada", () => {
    const pyme = {
      name: "Plan Fijo Luz",
      providerName: "NATURGY PYMES",
      accessTariff: "3.0TD",
      segment: "residencial",
      supplyType: "luz",
    }
    expect(
      tariffMatchesMarcoScreen(pyme, {
        tipo: "luz",
        segmento: "pyme",
        peaje: "3.0TD",
        search: "fijo",
      })
    ).toBe(true)
    expect(
      tariffMatchesMarcoScreen(pyme, {
        tipo: "gas",
        segmento: "todos",
        peaje: "todos",
        search: "",
      })
    ).toBe(false)
  })
})
