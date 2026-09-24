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

  it("joins marco for commission and excludes tariffs without marco link", () => {
    const marco = marcoRow({ id: "m1", at_rate_id: "at1", tariff_id: "t1", potencia_boe: true })
    const index = buildMarcoRetributivoIndex([marco])
    const catalog = [
      makeTariff(),
      makeTariff({ tariffId: "t2", atRateId: null, providerName: "Sin Marco" }),
    ]

    const result = buildComparadorEnVivoRanking({
      catalog,
      marcoRows: [marco],
      form: baseForm,
    })

    const withMarco = result.resultados.find((r) => r.tariffId === "t1")

    expect(withMarco?.comisionEstimada).toBe(50)
    expect(result.resultados).toHaveLength(1)
    expect(index.byAtRateId.get("at1")).toBeDefined()
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

  it("includes tariff when marco fills missing potencia prices", () => {
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

    expect(result.resultados).toHaveLength(1)
    expect(result.resultados[0]?.precios.P1?.powerPriceKwDay).toBe(0.08)
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
})
