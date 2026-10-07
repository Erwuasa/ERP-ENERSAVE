import { describe, expect, it } from "vitest"
import {
  buildComparadorEnVivoRanking,
  buildMarcoRetributivoIndex,
  type ComparadorEnVivoFormState,
} from "./comparador-en-vivo-ranking"
import type { TariffConPrecios } from "./supabase/tariffs-catalog"
import type { MarcoRetributivoRow } from "./supabase/marco-retributivo"
import { marcoRowsForCatalog } from "./comparador-test-marco"

const baseForm: ComparadorEnVivoFormState = {
  segmento: "residencial",
  peaje: "2.0TD",
  potencias: { p1: 4.6, p2: 4.6, p3: null, p4: null, p5: null, p6: null },
  consumos: { p1: 1000, p2: 800, p3: 1200, p4: null, p5: null, p6: null },
  diasFacturacion: 30,
  alquilerContador: 1.84,
  bonoSocial: null,
  energiaReactiva: null,
  otrosCostesSva: null,
  companiaActual: null,
  tipoPrecioFiltro: null,
  sinSva: false,
  soloPotenciaBoe: false,
  consumoAnualKwh: null,
  facturaMensual: null,
}

function makeTariff(overrides: Partial<TariffConPrecios> = {}): TariffConPrecios {
  return {
    tariffId: "t1",
    atRateId: "at1",
    name: "Tarifa Test",
    providerName: "Compañía A",
    providerId: "p1",
    supplyType: "luz",
    accessTariff: "2.0TD",
    segment: "residencial",
    isIndexed: false,
    svaPriceMonthly: null,
    isSolarRate: false,
    providerLogoUrl: null,
    precios: {
      P1: { energyPriceKwh: 0.15, powerPriceKwDay: 0.08 },
      P2: { energyPriceKwh: 0.12, powerPriceKwDay: 0.04 },
      P3: { energyPriceKwh: 0.1, powerPriceKwDay: 0 },
    },
    ...overrides,
  }
}

function marcoRow(
  overrides: Partial<MarcoRetributivoRow> & Pick<MarcoRetributivoRow, "id">
): MarcoRetributivoRow {
  return {
    compania: "Compañía A",
    tarifa: "Tarifa Test",
    tipo: "luz",
    peaje: "2.0TD",
    segmento: "residencial",
    condicion_1: null,
    condicion_2: null,
    condiciones: null,
    comision_tipo: "fija",
    comision_base: 50,
    comision_unidad: "eur_cups",
    vigencia_meses: 12,
    fecha_inicio: "2025-01-01",
    activo: true,
    created_at: "2025-01-01",
    updated_at: "2025-01-01",
    updated_by: null,
    energia_p1: 0.15,
    energia_p2: 0.12,
    energia_p3: 0.1,
    energia_p4: null,
    energia_p5: null,
    energia_p6: null,
    potencia_p1: 0.08,
    potencia_p2: 0.04,
    potencia_p3: null,
    potencia_p4: null,
    potencia_p5: null,
    potencia_p6: null,
    ...overrides,
  }
}

describe("buildComparadorEnVivoRanking", () => {
  it("no devuelve ofertas sin potencia ni consumo introducidos", () => {
    const catalog = [makeTariff()]
    const marcoRows = marcoRowsForCatalog(catalog)
    const { resultados } = buildComparadorEnVivoRanking({
      catalog,
      marcoRows,
      form: {
        ...baseForm,
        potencias: { p1: null, p2: null, p3: null, p4: null, p5: null, p6: null },
        consumos: { p1: null, p2: null, p3: null, p4: null, p5: null, p6: null },
      },
    })
    expect(resultados).toHaveLength(0)
  })

  it("excludes current company from ranking", () => {
    const catalog = [makeTariff(), makeTariff({ tariffId: "t2", providerName: "Compañía B" })]
    const result = buildComparadorEnVivoRanking({
      catalog,
      marcoRows: marcoRowsForCatalog(catalog),
      form: { ...baseForm, companiaActual: "Compañía A" },
    })

    expect(result.resultados).toHaveLength(1)
    expect(result.resultados[0].providerName).toBe("Compañía B")
  })

  it("filters by fijo/indexado and sin SVA", () => {
    const catalog = [
      makeTariff({ tariffId: "fijo", name: "Plan Estable", isIndexed: false }),
      makeTariff({ tariffId: "index", name: "Tarifa Indexada", isIndexed: true }),
      makeTariff({
        tariffId: "variable",
        name: "PLAN VARIABLE LUZ JULIO",
        isIndexed: false,
      }),
      makeTariff({ tariffId: "sva", svaPriceMonthly: 5 }),
    ]

    const marco = marcoRowsForCatalog(catalog)
    const fijo = buildComparadorEnVivoRanking({
      catalog,
      marcoRows: marco,
      form: { ...baseForm, tipoPrecioFiltro: "fijo" },
    })
    expect(fijo.resultados.map((r) => r.tariffId).sort()).toEqual(["fijo", "sva"])

    const indexado = buildComparadorEnVivoRanking({
      catalog,
      marcoRows: marco,
      form: { ...baseForm, tipoPrecioFiltro: "indexado" },
    })
    expect(indexado.resultados.map((r) => r.tariffId).sort()).toEqual(["index", "variable"])

    const sinSva = buildComparadorEnVivoRanking({
      catalog,
      marcoRows: marco,
      form: { ...baseForm, sinSva: true },
    })
    expect(sinSva.resultados.map((r) => r.tariffId)).not.toContain("sva")
  })

  it("muestra la tarifa residencial con precio aunque no tenga marco", () => {
    const marco = marcoRow({ id: "m1", at_rate_id: "at1", tariff_id: "t1", potencia_boe: true })
    const index = buildMarcoRetributivoIndex([marco])
    const catalog = [
      makeTariff(),
      makeTariff({ tariffId: "t2", atRateId: null, name: "Plan Suelto", providerName: "Iberdrola" }),
    ]

    const result = buildComparadorEnVivoRanking({
      catalog,
      marcoRows: [marco],
      form: baseForm,
    })

    const withMarco = result.resultados.find((r) => r.tariffId === "t1")
    const withoutMarco = result.resultados.find((r) => r.tariffId === "t2")

    expect(withMarco?.comisionEstimada).toBe(50)
    expect(withoutMarco?.comisionEstimada).toBeNull()
    expect(result.resultados).toHaveLength(2)
    expect(index.byAtRateId.get("at1")).toBeDefined()
  })

  it("usa el precio PYME cuando el marco residencial coincide", () => {
    const pyme = makeTariff({
      tariffId: "pyme-plana",
      atRateId: null,
      segment: "pyme",
      name: "PLANA 3.0",
      providerName: "Endesa",
    })
    const soloPyme = makeTariff({
      tariffId: "pyme-solo",
      atRateId: null,
      segment: "pyme",
      name: "SOLO EMPRESA",
      providerName: "Endesa",
    })
    const marco = marcoRow({
      id: "m-res",
      compania: "Endesa",
      tarifa: "PLANA 3.0",
      segmento: "residencial",
      peaje: "2.0TD",
      at_rate_id: null,
      tariff_id: null,
    })

    const result = buildComparadorEnVivoRanking({
      catalog: [pyme, soloPyme],
      marcoRows: [marco],
      form: baseForm,
    })

    expect(result.resultados.map((row) => row.tariffId)).toEqual(["pyme-plana"])
    expect(result.resultados[0]?.comisionEstimada).toBe(50)
  })

  it("excludes tariffs without complete pricing for user data", () => {
    const catalog = [
      makeTariff({
        tariffId: "solo-energia",
        name: "Solo energía",
        precios: {
          P1: { energyPriceKwh: 0.06, powerPriceKwDay: 0 },
          P2: { energyPriceKwh: 0.06, powerPriceKwDay: 0 },
          P3: { energyPriceKwh: 0.06, powerPriceKwDay: 0 },
        },
      }),
      makeTariff({
        tariffId: "completa",
        name: "Completa",
        precios: {
          P1: { energyPriceKwh: 0.06, powerPriceKwDay: 0.08 },
          P2: { energyPriceKwh: 0.06, powerPriceKwDay: 0.04 },
          P3: { energyPriceKwh: 0.06, powerPriceKwDay: 0 },
        },
      }),
    ]

    const result = buildComparadorEnVivoRanking({
      catalog,
      marcoRows: marcoRowsForCatalog(catalog),
      form: baseForm,
    })

    expect(result.resultados.map((r) => r.tariffId)).toEqual(["completa"])
  })

  it("excludes tariff when only the marco has potencia prices", () => {
    const marco = marcoRow({
      id: "m-niba",
      at_rate_id: "at1",
      tariff_id: "t1",
      potencia_p1: 0.08,
      potencia_p2: 0.04,
    })

    const catalog = [
      makeTariff({
        tariffId: "t1",
        atRateId: "at1",
        name: "Excedentes",
        providerName: "Niba",
        precios: {
          P1: { energyPriceKwh: 0.06, powerPriceKwDay: 0 },
          P2: { energyPriceKwh: 0.06, powerPriceKwDay: 0 },
          P3: { energyPriceKwh: 0.06, powerPriceKwDay: 0 },
        },
      }),
    ]

    const result = buildComparadorEnVivoRanking({
      catalog,
      marcoRows: [marco],
      form: baseForm,
    })

    expect(result.resultados).toHaveLength(0)
  })

  it("excludes IGNIS and segment mismatches in residencial ranking", () => {
    const catalog = [
      makeTariff({ tariffId: "ignis-res", providerName: "IGNIS", segment: "residencial" }),
      makeTariff({
        tariffId: "ignis-pyme",
        providerName: "IGNIS",
        segment: "pyme",
        accessTariff: "3.0TD",
        precios: {
          P1: { energyPriceKwh: 0.15, powerPriceKwDay: 0.08 },
          P2: { energyPriceKwh: 0.12, powerPriceKwDay: 0.04 },
          P3: { energyPriceKwh: 0.1, powerPriceKwDay: 0.03 },
          P4: { energyPriceKwh: 0.09, powerPriceKwDay: 0.02 },
          P5: { energyPriceKwh: 0.08, powerPriceKwDay: 0.02 },
          P6: { energyPriceKwh: 0.07, powerPriceKwDay: 0.01 },
        },
      }),
      makeTariff({ tariffId: "ok-res", providerName: "Endesa", segment: "residencial" }),
    ]

    const marco = marcoRowsForCatalog(catalog)
    const residencial = buildComparadorEnVivoRanking({
      catalog,
      marcoRows: marco,
      form: { ...baseForm, segmento: "residencial" },
    })
    expect(residencial.resultados.map((r) => r.tariffId)).toEqual(["ok-res"])

    const pyme = buildComparadorEnVivoRanking({
      catalog,
      marcoRows: marco,
      form: { ...baseForm, segmento: "pyme", peaje: "3.0TD" },
    })
    expect(pyme.resultados.map((r) => r.tariffId)).toContain("ignis-pyme")
  })

  it("filters potencia BOE via linked marco only", () => {
    const marcoBoe = marcoRow({ id: "m1", at_rate_id: "at1", tariff_id: "t1", potencia_boe: true })
    const marcoNoBoe = marcoRow({ id: "m2", at_rate_id: "at2", tariff_id: "t2", potencia_boe: false })

    const catalog = [
      makeTariff({ tariffId: "t1", atRateId: "at1" }),
      makeTariff({ tariffId: "t2", atRateId: "at2", providerName: "B" }),
      makeTariff({ tariffId: "t3", atRateId: null, providerName: "C" }),
    ]

    const result = buildComparadorEnVivoRanking({
      catalog,
      marcoRows: [marcoBoe, marcoNoBoe],
      form: { ...baseForm, soloPotenciaBoe: true },
    })

    expect(result.resultados.map((r) => r.tariffId)).toEqual(["t1"])
  })

  it("aplica peaje, SVA por nombre y potencia BOE aunque la columna venga en falso", () => {
    const boe = marcoRow({
      id: "m-boe",
      at_rate_id: "at-boe",
      tariff_id: "t-boe",
      tarifa: "POTENCIA BOE 10",
      peaje: "3.0TD",
      segmento: "pyme",
      potencia_boe: false,
    })
    const conSva = marcoRow({
      id: "m-sva",
      at_rate_id: "at-sva",
      tariff_id: "t-sva",
      tarifa: "LUZ 24H + SVA",
      peaje: "3.0TD",
      segmento: "pyme",
      potencia_boe: false,
    })
    const normal = marcoRow({
      id: "m-normal",
      at_rate_id: "at-normal",
      tariff_id: "t-normal",
      tarifa: "Estable",
      peaje: "3.0TD",
      segmento: "pyme",
      potencia_boe: false,
    })
    const precios = {
      P1: { energyPriceKwh: 0.15, powerPriceKwDay: 0.08 },
      P2: { energyPriceKwh: 0.12, powerPriceKwDay: 0.04 },
      P3: { energyPriceKwh: 0.1, powerPriceKwDay: 0.03 },
      P4: { energyPriceKwh: 0.09, powerPriceKwDay: 0.02 },
      P5: { energyPriceKwh: 0.08, powerPriceKwDay: 0.02 },
      P6: { energyPriceKwh: 0.07, powerPriceKwDay: 0.01 },
    }
    const catalog = [
      makeTariff({
        tariffId: "t-boe",
        atRateId: "at-boe",
        name: "POTENCIA BOE 10",
        segment: "pyme",
        accessTariff: "3.0TD",
        precios,
      }),
      makeTariff({
        tariffId: "t-sva",
        atRateId: "at-sva",
        name: "LUZ 24H + SVA",
        segment: "pyme",
        accessTariff: "3.0TD",
        svaPriceMonthly: null,
        precios,
      }),
      makeTariff({
        tariffId: "t-normal",
        atRateId: "at-normal",
        name: "Estable",
        segment: "pyme",
        accessTariff: "3.0TD",
        precios,
      }),
      makeTariff({
        tariffId: "t-20",
        atRateId: "at-20",
        name: "Residencial 2.0",
        segment: "pyme",
        accessTariff: "2.0TD",
        precios,
      }),
    ]
    const marco20 = marcoRow({
      id: "m-20",
      at_rate_id: "at-20",
      tariff_id: "t-20",
      peaje: "2.0TD",
      segmento: "pyme",
    })
    const form = { ...baseForm, segmento: "pyme" as const, peaje: "3.0TD" }

    const boeOnly = buildComparadorEnVivoRanking({
      catalog,
      marcoRows: [boe, conSva, normal, marco20],
      form: { ...form, soloPotenciaBoe: true },
    })
    expect(boeOnly.resultados.map((row) => row.tariffId)).toEqual(["t-boe"])

    const sinSva = buildComparadorEnVivoRanking({
      catalog,
      marcoRows: [boe, conSva, normal, marco20],
      form: { ...form, sinSva: true },
    })
    expect(sinSva.resultados.map((row) => row.tariffId)).not.toContain("t-sva")
    expect(sinSva.resultados.map((row) => row.tariffId)).not.toContain("t-20")
  })

  it("ranquea un catálogo PYME 3.0 grande sin recorrer todo el marco", () => {
    const catalog = []
    const marcoRows = []
    const precios = {
      P1: { energyPriceKwh: 0.15, powerPriceKwDay: 0.08 },
      P2: { energyPriceKwh: 0.14, powerPriceKwDay: 0.07 },
      P3: { energyPriceKwh: 0.13, powerPriceKwDay: 0.06 },
      P4: { energyPriceKwh: 0.12, powerPriceKwDay: 0.05 },
      P5: { energyPriceKwh: 0.11, powerPriceKwDay: 0.04 },
      P6: { energyPriceKwh: 0.1, powerPriceKwDay: 0.03 },
    }

    for (let companyIndex = 0; companyIndex < 25; companyIndex += 1) {
      const company = `Comercializadora ${companyIndex}`
      for (let tariffIndex = 0; tariffIndex < 18; tariffIndex += 1) {
        catalog.push(
          makeTariff({
            tariffId: `t-${companyIndex}-${tariffIndex}`,
            atRateId: null,
            name: `Oferta ${companyIndex}-${tariffIndex}`,
            providerName: company,
            segment: "pyme",
            accessTariff: "3.0TD",
            precios,
          })
        )
      }
      for (let marcoIndex = 0; marcoIndex < 30; marcoIndex += 1) {
        marcoRows.push(
          marcoRow({
            id: `m-${companyIndex}-${marcoIndex}`,
            compania: company,
            tarifa: `Marco ${companyIndex}-${marcoIndex}`,
            segmento: "pyme",
            peaje: "3.0TD",
            at_rate_id: null,
            tariff_id: null,
          })
        )
      }
    }

    for (let index = 0; index < 1500; index += 1) {
      marcoRows.push(
        marcoRow({
          id: `noise-${index}`,
          compania: `Ajena ${index}`,
          tarifa: `Ruido ${index}`,
          segmento: "residencial",
          peaje: "2.0TD",
        })
      )
    }

    const started = performance.now()
    const result = buildComparadorEnVivoRanking({
      catalog,
      marcoRows,
      form: { ...baseForm, segmento: "pyme", peaje: "3.0TD" },
    })
    const elapsed = performance.now() - started

    expect(result.resultados).toHaveLength(450)
    expect(elapsed).toBeLessThan(1000)
  })
})
