import { describe, expect, it } from "vitest"
import {
  formatKwhRangeAsMwhLabel,
  migrateMarcoCondicionesFields,
  normalizeTramoCondicionText,
  resolveMarcoCondicion2Label,
} from "./marco-tramo-condicion"

describe("marco-tramo-condicion", () => {
  it("normaliza Tramo: 200-300 MWh a solo rango", () => {
    expect(normalizeTramoCondicionText("Tramo: 200-300 MWh")).toBe("200-300 MWh")
  })

  it("convierte kWh a MWh en condición", () => {
    expect(normalizeTramoCondicionText("10000-20000 kWh")).toBe("10-20 MWh")
  })

  it("prioriza condicion_2 cuando hay varios tramos json", () => {
    expect(
      resolveMarcoCondicion2Label({
        id: "1",
        compania: "Naturgy",
        tarifa: "BASE",
        tipo: "luz",
        peaje: "Todas",
        segmento: "pyme",
        condicion_1: "Tramo: General",
        condicion_2: "10-∞ MWh",
        condiciones: null,
        comision_tipo: "fija",
        comision_base: 96,
        comision_unidad: "eur_cups",
        vigencia_meses: 12,
        fecha_inicio: "2026-01-01",
        activo: true,
        created_at: "",
        updated_at: "",
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
        tramos: [
          { desde_kwh: 0, hasta_kwh: 9999, comision_base: 96, unidad: "eur_cups" },
          { desde_kwh: 10000, hasta_kwh: 999999999, comision_base: 11.2, unidad: "eur_mwh" },
        ],
      })
    ).toBe("10-∞ MWh")
  })

  it("formatea rango abierto en MWh", () => {
    expect(formatKwhRangeAsMwhLabel(10000, 999999999)).toBe("10-∞ MWh")
  })

  it("migra tramo de condicion_1 a condicion_2 y camp a condicion_1", () => {
    expect(
      migrateMarcoCondicionesFields("Tramo: 750–1250 MWh", "Camp: AIRE")
    ).toEqual({
      condicion_1: "Camp: AIRE",
      condicion_2: "750-1250 MWh",
    })
  })

  it("no lee tramos desde condicion_1 en la tabla", () => {
    expect(
      resolveMarcoCondicion2Label({
        id: "1",
        compania: "Neon",
        tarifa: "FIJA AIRE",
        tipo: "luz",
        peaje: "6.1TD",
        segmento: "pyme",
        condicion_1: "Tramo: 750-1250 MWh",
        condicion_2: "Camp: AIRE",
        condiciones: null,
        comision_tipo: "fija",
        comision_base: 100,
        comision_unidad: "eur_cups",
        vigencia_meses: 12,
        fecha_inicio: "2026-01-01",
        activo: true,
        created_at: "",
        updated_at: "",
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
      })
    ).toBe("750-1250 MWh")
  })
})
