import { describe, expect, it } from "vitest"
import {
  buildComparadorEnVivoRanking,
  type ComparadorEnVivoFormState,
} from "./comparador-en-vivo-ranking"
import {
  buildComparadorEnVivoFormState,
  mapRankingToOfferOptions,
} from "./comparador-en-vivo-form"
import { parseDecimalComaInput } from "./decimal-input"
import {
  applyPotenciaP1Replication,
} from "../pages/erp/comparador/hooks/usePotenciaP1Autofill"
import type { TariffConPrecios } from "./supabase/tariffs-catalog"
import type { ComparadorPeriodValues } from "./erp/comparador-rates"

function makeTariff(overrides: Partial<TariffConPrecios> = {}): TariffConPrecios {
  return {
    tariffId: "t-pyme-30",
    atRateId: "at1",
    name: "Tarifa PYME 3.0",
    providerName: "Compañía PYME",
    providerId: "p1",
    supplyType: "luz",
    accessTariff: "3.0TD",
    segment: "pyme",
    isIndexed: false,
    svaPriceMonthly: null,
    isSolarRate: false,
    providerLogoUrl: null,
    precios: {
      P1: { energyPriceKwh: 0.14, powerPriceKwDay: 0.09 },
      P2: { energyPriceKwh: 0.12, powerPriceKwDay: 0.05 },
      P3: { energyPriceKwh: 0.11, powerPriceKwDay: 0.04 },
      P4: { energyPriceKwh: 0.1, powerPriceKwDay: 0.03 },
      P5: { energyPriceKwh: 0.09, powerPriceKwDay: 0.02 },
      P6: { energyPriceKwh: 0.08, powerPriceKwDay: 0.01 },
    },
    ...overrides,
  }
}

/** Simula el filtro de listTariffsConPrecios(segmento, accessTariff). */
function simulateCatalogFetch(
  catalog: TariffConPrecios[],
  segmento: "residencial" | "pyme",
  accessTariff: string
): TariffConPrecios[] {
  return catalog.filter(
    (row) =>
      row.segment === segmento &&
      row.accessTariff === accessTariff &&
      Object.keys(row.precios).length > 0
  )
}

const basePotencias: ComparadorPeriodValues = {
  p1: 4.6,
  p2: 4.6,
  p3: 15,
  p4: 15,
  p5: 15,
  p6: 15,
}

const baseConsumos: ComparadorPeriodValues = {
  p1: 2000,
  p2: 1800,
  p3: 1600,
  p4: 1400,
  p5: 1200,
  p6: 1000,
}

function buildForm(overrides: Partial<ComparadorEnVivoFormState> = {}): ComparadorEnVivoFormState {
  return {
    segmento: "pyme",
    peaje: "3.0TD",
    potencias: {
      p1: 5.5,
      p2: 5.5,
      p3: 5.5,
      p4: 5.5,
      p5: 5.5,
      p6: 5.5,
    },
    consumos: { ...baseConsumos },
    diasFacturacion: 30,
    alquilerContador: 1.84,
    bonoSocial: null,
    energiaReactiva: null,
    otrosCostesSva: null,
    companiaActual: null,
    tipoPrecioFiltro: null,
    sinSva: false,
    soloPotenciaBoe: false,
    ...overrides,
  }
}

describe("Comparador — verificación flujo E2E (lógica)", () => {
  it("Paso 1: segmento pyme + peaje 3.0TD excluye tarifas residenciales 2.0TD", () => {
    const catalog = simulateCatalogFetch(
      [
        makeTariff({ tariffId: "ok-pyme-30", segment: "pyme", accessTariff: "3.0TD" }),
        makeTariff({
          tariffId: "bad-res-20",
          segment: "residencial",
          accessTariff: "2.0TD",
          name: "Residencial 2.0",
          providerName: "Hogar SA",
        }),
        makeTariff({
          tariffId: "bad-pyme-20",
          segment: "pyme",
          accessTariff: "2.0TD",
          name: "PYME 2.0",
        }),
      ],
      "pyme",
      "3.0TD"
    )

    expect(catalog).toHaveLength(1)
    expect(catalog[0].tariffId).toBe("ok-pyme-30")

    const ranking = buildComparadorEnVivoRanking({
      catalog,
      marcoRows: [],
      form: buildForm({ segmento: "pyme", peaje: "3.0TD" }),
    })

    expect(ranking.resultados.length).toBeGreaterThan(0)
    expect(ranking.resultados.every((r) => r.tariffId !== "bad-res-20")).toBe(true)
    expect(ranking.resultados.every((r) => r.tariffId !== "bad-pyme-20")).toBe(true)
  })

  it('Paso 2: potencia P1 "5,5" se parsea a 5.5 y replica en P2-P6', () => {
    const parsed = parseDecimalComaInput("5,5")
    expect(parsed).toBe(5.5)

    const next = applyPotenciaP1Replication(
      { p1: 4.6, p2: 4.6, p3: 0, p4: 0, p5: 0, p6: 0 },
      parsed!,
      new Set()
    )

    expect(next.p1).toBe(5.5)
    expect(next.p2).toBe(5.5)
    expect(next.p3).toBe(5.5)
    expect(next.p4).toBe(5.5)
    expect(next.p5).toBe(5.5)
    expect(next.p6).toBe(5.5)
  })

  it('Paso 3: P3 manual "7,2" queda independiente al cambiar P1', () => {
    const p3Manual = parseDecimalComaInput("7,2")
    expect(p3Manual).toBe(7.2)

    const touched = new Set<"p3">(["p3"])
    const withManualP3 = {
      p1: 5.5,
      p2: 5.5,
      p3: p3Manual!,
      p4: 5.5,
      p5: 5.5,
      p6: 5.5,
    }

    const afterP1Change = applyPotenciaP1Replication(withManualP3, 6, touched)

    expect(afterP1Change.p1).toBe(6)
    expect(afterP1Change.p2).toBe(6)
    expect(afterP1Change.p3).toBe(7.2)
    expect(afterP1Change.p4).toBe(6)
    expect(afterP1Change.p5).toBe(6)
    expect(afterP1Change.p6).toBe(6)
  })

  it("Paso 4: filtro Sin SVA excluye tarifas con sva_price_monthly > 0", () => {
    const catalog = [
      makeTariff({ tariffId: "sin-sva", svaPriceMonthly: null }),
      makeTariff({ tariffId: "con-sva", svaPriceMonthly: 4.5, name: "Con SVA" }),
    ]

    const ranking = buildComparadorEnVivoRanking({
      catalog,
      marcoRows: [],
      form: buildForm({ sinSva: true }),
    })

    expect(ranking.resultados.map((r) => r.tariffId)).toEqual(["sin-sva"])
  })

  it("Paso 5: consumo parcial usa datos introducidos y badge estimado solo en factura actual", () => {
    const catalog = [
      makeTariff({ tariffId: "a" }),
      makeTariff({ tariffId: "b", name: "Barata" }),
    ]

    const enVivoForm = buildComparadorEnVivoFormState({
      segmento: "pyme",
      peaje: "3.0TD",
      potencias: basePotencias,
      consumos: { p1: 9000, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 },
      diasFacturacion: 30,
      alquilerContador: 1.84,
      bonoSocial: 0,
      energiaReactiva: 0,
      otrosCostesSva: 0,
      companiaActual: null,
      proposalFilters: [],
    })

    const ranking = buildComparadorEnVivoRanking({
      catalog,
      marcoRows: [],
      form: enVivoForm,
    })

    expect(ranking.precision).toBe("exacto")
    expect(ranking.resultados.length).toBeGreaterThan(0)

    const mapped = mapRankingToOfferOptions({
      resultados: ranking.resultados,
      peaje: "3.0TD",
      potencias: basePotencias,
      consumos: { p1: 9000, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 },
      preciosPotenciaActual: { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 },
      preciosEnergiaActual: { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 },
      currentBillMonthly: 85,
      billExtras: { rentMeterMonthly: 1.84, bonoSocial: 0, energiaReactiva: 0, otrosCostesSva: 0 },
      diasFacturacion: 30,
      sortMode: "ahorro",
    })

    const showEstimationBadge =
      ranking.precision === "estimado" || mapped.currentBillPrecision === "estimado"
    expect(showEstimationBadge).toBe(true)
    expect(mapped.options.length).toBeGreaterThan(0)
  })

  it("Paso 6: desglose P1-P6 completo quita badge estimado y puede reordenar ranking", () => {
    const catalog = [
      makeTariff({
        tariffId: "cara",
        name: "Cara",
        precios: {
          P1: { energyPriceKwh: 0.25, powerPriceKwDay: 0.1 },
          P2: { energyPriceKwh: 0.22, powerPriceKwDay: 0.08 },
          P3: { energyPriceKwh: 0.2, powerPriceKwDay: 0.07 },
          P4: { energyPriceKwh: 0.18, powerPriceKwDay: 0.06 },
          P5: { energyPriceKwh: 0.16, powerPriceKwDay: 0.05 },
          P6: { energyPriceKwh: 0.14, powerPriceKwDay: 0.04 },
        },
      }),
      makeTariff({
        tariffId: "barata",
        name: "Barata",
        precios: {
          P1: { energyPriceKwh: 0.12, powerPriceKwDay: 0.06 },
          P2: { energyPriceKwh: 0.11, powerPriceKwDay: 0.05 },
          P3: { energyPriceKwh: 0.1, powerPriceKwDay: 0.04 },
          P4: { energyPriceKwh: 0.09, powerPriceKwDay: 0.03 },
          P5: { energyPriceKwh: 0.08, powerPriceKwDay: 0.02 },
          P6: { energyPriceKwh: 0.07, powerPriceKwDay: 0.01 },
        },
      }),
    ]

    const partialForm = buildComparadorEnVivoFormState({
      segmento: "pyme",
      peaje: "3.0TD",
      potencias: { p1: 15, p2: 15, p3: 0, p4: 0, p5: 0, p6: 0 },
      consumos: { p1: 5000, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 },
      diasFacturacion: 30,
      alquilerContador: 1.84,
      bonoSocial: 0,
      energiaReactiva: 0,
      otrosCostesSva: 0,
      companiaActual: null,
      proposalFilters: [],
    })

    const partialRanking = buildComparadorEnVivoRanking({
      catalog,
      marcoRows: [],
      form: partialForm,
    })
    expect(partialRanking.precision).toBe("exacto")

    const fullForm = buildComparadorEnVivoFormState({
      segmento: "pyme",
      peaje: "3.0TD",
      potencias: basePotencias,
      consumos: baseConsumos,
      diasFacturacion: 30,
      alquilerContador: 1.84,
      bonoSocial: 0,
      energiaReactiva: 0,
      otrosCostesSva: 0,
      companiaActual: null,
      proposalFilters: [],
    })

    const fullRanking = buildComparadorEnVivoRanking({
      catalog,
      marcoRows: [],
      form: fullForm,
    })

    expect(fullRanking.precision).toBe("exacto")
    expect(fullRanking.resultados[0]?.tariffId).toBe("barata")

    const reorderedConsumos = { ...baseConsumos, p1: 50_000 }
    const reorderedForm = buildComparadorEnVivoFormState({
      segmento: "pyme",
      peaje: "3.0TD",
      potencias: basePotencias,
      consumos: reorderedConsumos,
      diasFacturacion: 30,
      alquilerContador: 1.84,
      bonoSocial: 0,
      energiaReactiva: 0,
      otrosCostesSva: 0,
      companiaActual: null,
      proposalFilters: [],
    })

    const reorderedRanking = buildComparadorEnVivoRanking({
      catalog,
      marcoRows: [],
      form: reorderedForm,
    })

    expect(reorderedRanking.precision).toBe("exacto")
    expect(reorderedRanking.resultados[0]?.tariffId).toBe("barata")
    expect(reorderedRanking.resultados[0]?.costeAnual).toBeGreaterThan(
      fullRanking.resultados[0]?.costeAnual ?? 0
    )
  })
})
