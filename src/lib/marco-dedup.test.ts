import { describe, expect, it } from "vitest"
import {
  areMarcoTarifaNamesSimilar,
  isMarcoGenericPlaceholderTariff,
  isMarcoReferenciaPlaceholder,
  listMarcoRowsToDeactivate,
  normalizeMarcoTarifaName,
} from "./marco-dedup"
import type { MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"

function sampleRow(overrides: Partial<MarcoRetributivoRow>): MarcoRetributivoRow {
  return {
    id: overrides.id ?? "1",
    compania: overrides.compania ?? "Endesa",
    tarifa: overrides.tarifa ?? "TEST",
    tipo: "luz",
    peaje: "2.0TD",
    segmento: "residencial",
    condicion_1: null,
    condicion_2: "General",
    condiciones: null,
    comision_tipo: "fija",
    comision_base: 97.2,
    comision_unidad: "eur_cups",
    vigencia_meses: 6,
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
  }
}

describe("marco-dedup", () => {
  it("normaliza + y con como equivalentes", () => {
    expect(normalizeMarcoTarifaName("LIBRE + PERMANENCIA")).toBe(
      normalizeMarcoTarifaName("LIBRE CON PERMANENCIA")
    )
  })

  it("detecta similitud +/con y prefijo FIJA", () => {
    expect(areMarcoTarifaNamesSimilar("LIBRE + PERMANENCIA", "LIBRE CON PERMANENCIA")).toBe(true)
    expect(areMarcoTarifaNamesSimilar("AIRE", "FIJA AIRE")).toBe(true)
    expect(areMarcoTarifaNamesSimilar("power", "FACIL POWER ENERGY")).toBe(true)
  })

  it("no mezcla sin vs con permanencia", () => {
    expect(areMarcoTarifaNamesSimilar("LIBRE + PERMANENCIA", "LIBRE SIN PERMANENCIA")).toBe(false)
  })

  it("no mezcla tarifas con sufijos distintivos", () => {
    expect(
      areMarcoTarifaNamesSimilar("TARIFA LUZ FIJA 24H", "TARIFA LUZ FIJA 24H MOBILE")
    ).toBe(false)
  })

  it("marca títulos genéricos de comisión como placeholder", () => {
    expect(isMarcoGenericPlaceholderTariff({ tarifa: "COMISION POR CONTRATO" })).toBe(true)
    expect(isMarcoGenericPlaceholderTariff({ tarifa: "COMISION DIRECTA" })).toBe(true)
    expect(
      isMarcoReferenciaPlaceholder({
        tarifa: "Acciona - Comisión de referencia",
        condicion_2: "No identificados",
      })
    ).toBe(true)
    expect(
      isMarcoReferenciaPlaceholder({
        tarifa: "Endesa - Comisión de referencia",
        condicion_2: "2.0TD 10-15 kW: 109,60€",
      })
    ).toBe(true)
    expect(isMarcoGenericPlaceholderTariff({ tarifa: "niba Electric Pro" })).toBe(false)
    expect(isMarcoGenericPlaceholderTariff({ tarifa: "LIBRE CON PERMANENCIA" })).toBe(false)
  })

  it("propone desactivar duplicados similares con misma comisión", () => {
    const rows = [
      sampleRow({ id: "a", tarifa: "LIBRE + PERMANENCIA" }),
      sampleRow({ id: "b", tarifa: "LIBRE CON PERMANENCIA" }),
    ]
    const deactivate = listMarcoRowsToDeactivate(rows)
    expect(deactivate).toHaveLength(1)
    expect(deactivate[0]?.tarifa).toBe("LIBRE + PERMANENCIA")
  })
})
