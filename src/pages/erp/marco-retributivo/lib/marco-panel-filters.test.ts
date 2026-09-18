import { describe, expect, it } from "vitest"
import type { MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"
import {
  filterMarcoRowsForTable,
  marcoCompaniaMatchesFilter,
  marcoPeajeMatchesFilter,
} from "./marco-panel-filters"

function sampleRow(compania: string, id: string): MarcoRetributivoRow {
  return {
    id,
    compania,
    tarifa: "TEST",
    tipo: "luz",
    peaje: "2.0TD",
    segmento: "pyme",
    condicion_1: null,
    condicion_2: null,
    condiciones: null,
    comision_tipo: "fija",
    comision_base: 1,
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
  }
}

describe("marcoCompaniaMatchesFilter", () => {
  it("permite todas las compañías con filtro Todos", () => {
    expect(marcoCompaniaMatchesFilter("Neon", "Todos")).toBe(true)
    expect(marcoCompaniaMatchesFilter("Endesa", "Todos")).toBe(true)
  })

  it("solo deja pasar la compañía seleccionada", () => {
    expect(marcoCompaniaMatchesFilter("Neon", "Endesa")).toBe(false)
    expect(marcoCompaniaMatchesFilter("Endesa", "Endesa")).toBe(true)
    expect(marcoCompaniaMatchesFilter("Naturgy", "Naturgy")).toBe(true)
  })

  it("no mezcla marcas por coincidencia parcial", () => {
    expect(marcoCompaniaMatchesFilter("Neon", "Endesa")).toBe(false)
    expect(marcoCompaniaMatchesFilter("Neon", "Naturgy")).toBe(false)
    expect(marcoCompaniaMatchesFilter("Total Energies", "TotalEnergies")).toBe(true)
  })
})

describe("filterMarcoRowsForTable", () => {
  it("excluye Neon cuando el filtro es Naturgy", () => {
    const rows = [
      sampleRow("Neon", "neon-1"),
      sampleRow("Neon", "neon-2"),
      sampleRow("Naturgy", "nat-1"),
    ]
    const filtered = filterMarcoRowsForTable(rows, "Naturgy")
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.compania).toBe("Naturgy")
  })
})

describe("marcoPeajeMatchesFilter", () => {
  it("matches any peaje when filter is todos", () => {
    expect(marcoPeajeMatchesFilter("Todas", "todos")).toBe(true)
    expect(marcoPeajeMatchesFilter("2.0TD", "todos")).toBe(true)
  })

  it("excluye peaje Todas cuando hay filtro concreto", () => {
    expect(marcoPeajeMatchesFilter("Todas", "2.0TD")).toBe(false)
    expect(marcoPeajeMatchesFilter("Todas", "3.0TD")).toBe(false)
  })

  it("matches substring peaje", () => {
    expect(marcoPeajeMatchesFilter("3.0TD", "3.0TD")).toBe(true)
    expect(marcoPeajeMatchesFilter("6.1TD", "3.0TD")).toBe(false)
  })
})
