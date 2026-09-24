import { describe, expect, it } from "vitest"
import { buildMarcoRetributivoIndex } from "./comparador-en-vivo-ranking"
import { resolveMarcoForComparadorTariff } from "./comparador-marco-resolver"
import type { MarcoRetributivoRow } from "./supabase/marco-retributivo"
import type { TariffConPrecios } from "./supabase/tariffs-catalog"

function marco(partial: Partial<MarcoRetributivoRow> & Pick<MarcoRetributivoRow, "id">): MarcoRetributivoRow {
  return {
    compania: "Niba",
    tarifa: "Niba Flex",
    tipo: "luz",
    peaje: "Todas",
    segmento: "residencial",
    condicion_1: null,
    condicion_2: "General",
    condiciones: null,
    comision_tipo: "fija",
    comision_base: 80,
    comision_unidad: "eur_cups",
    vigencia_meses: 12,
    fecha_inicio: "2026-01-01",
    activo: true,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
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
    ...partial,
  }
}

const tariff: TariffConPrecios = {
  tariffId: "t-niba-flex",
  name: "niba Flex",
  providerName: "Niba",
  providerId: "p1",
  supplyType: "luz",
  accessTariff: "2.0TD",
  segment: "residencial",
  isIndexed: false,
  svaPriceMonthly: null,
  isSolarRate: false,
  atRateId: "at-unknown",
  providerLogoUrl: null,
  precios: {
    P1: { energyPriceKwh: 0.12, powerPriceKwDay: 0.05 },
    P2: { energyPriceKwh: 0.1, powerPriceKwDay: 0.03 },
    P3: { energyPriceKwh: 0.08, powerPriceKwDay: 0 },
  },
}

describe("resolveMarcoForComparadorTariff", () => {
  it("empareja por compañía y nombre aunque falten tariff_id y at_rate_id", () => {
    const rows = [marco({ id: "m1" })]
    const index = buildMarcoRetributivoIndex(rows)
    const resolved = resolveMarcoForComparadorTariff(tariff, index, rows, "2.0TD")
    expect(resolved?.id).toBe("m1")
  })
})
