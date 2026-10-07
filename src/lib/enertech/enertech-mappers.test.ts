import { describe, expect, it } from "vitest"
import {
  mapCliente,
  mapComercializadora,
  mapContrato,
  mapFeedRow,
  mapTarifaAcceso,
} from "../../../supabase/functions/_shared/enertech-mappers"

describe("mapComercializadora", () => {
  it("accepts the common field spellings and keeps the raw row", () => {
    const raw = { id_company: "14", name: "Endesa", extra: true }
    expect(mapComercializadora(raw)).toMatchObject({
      key: "14",
      columns: { id: 14, nombre: "Endesa" },
      payload: raw,
    })
  })

  it("skips rows without an id", () => {
    expect(mapComercializadora({ nombre: "X" })).toBeNull()
  })
})

describe("mapTarifaAcceso", () => {
  it("maps the documented shape", () => {
    expect(mapTarifaAcceso({ id_rate: 3, nombre: "2.0TD", producto: "luz" })).toMatchObject({
      key: "3",
      columns: { id_rate: 3, nombre: "2.0TD", producto: "luz" },
    })
  })
})

describe("mapFeedRow", () => {
  it("keys by clave and carries actualizado_en for tracking", () => {
    const row = mapFeedRow({ clave: "tf_abc", id: 9876, actualizado_en: "2026-10-01", id_company: 14, tipo: "fijo" })
    expect(row).toMatchObject({
      key: "tf_abc",
      actualizadoEn: "2026-10-01",
      columns: { clave: "tf_abc", id: 9876, company_id: 14, tipo: "fijo" },
    })
  })

  it("falls back to the numeric id when clave is missing", () => {
    expect(mapFeedRow({ id: 5 })?.key).toBe("id:5")
  })

  it("skips rows with neither", () => {
    expect(mapFeedRow({ precio: 1 })).toBeNull()
  })

  it("tolerates a null id", () => {
    expect(mapFeedRow({ clave: "tf_x", id: null })?.columns).toMatchObject({ id: null })
  })
})

describe("mapCliente", () => {
  it("maps the documented ClienteResumen", () => {
    expect(
      mapCliente({ id_customer: 7, nombre: "Ana", dni_cif: "12345678Z", rgpd: 0, fecha_alta: "2026-01-01" })
    ).toMatchObject({ key: "7", columns: { id_customer: 7, rgpd: false, dni_cif: "12345678Z" } })
  })
})

describe("mapContrato", () => {
  it("flattens cliente and estado and tracks fecha_actualizacion", () => {
    const row = mapContrato({
      id_contract: 12345,
      cups: "ES0031408000000000AF",
      cliente: { id: 7, nombre: "Ana" },
      compania: "Endesa",
      producto: "Luz",
      estado: { id: 5, nombre: "Activo", final: false },
      incidencia: null,
      fecha_actualizacion: "2026-10-05 09:30:00",
    })
    expect(row).toMatchObject({
      key: "12345",
      actualizadoEn: "2026-10-05 09:30:00",
      columns: { cliente_id: 7, estado_id: 5, estado_nombre: "Activo", estado_final: false, incidencia: null },
    })
  })
})
