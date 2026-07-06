import { describe, expect, it } from "vitest"
import type { ActividadTipo } from "../../lib/ventas/types"
import { formatTimestamp, getActividadIcon, getActividadTipoLabel } from "./ficha-ui"

const TIPOS: ActividadTipo[] = [
  "llamada",
  "visita",
  "email",
  "whatsapp",
  "nota",
  "cambio_fase",
  "documento",
  "propuesta_enviada",
  "contrato_creado",
]

describe("ficha-ui", () => {
  it("getActividadIcon returns icon for every ActividadTipo", () => {
    for (const tipo of TIPOS) {
      expect(getActividadIcon(tipo)).toBeDefined()
    }
  })

  it("getActividadTipoLabel returns Spanish label", () => {
    expect(getActividadTipoLabel("llamada")).toBe("Llamada")
  })

  it("formatTimestamp returns non-empty es-ES string", () => {
    const formatted = formatTimestamp("2026-06-17T15:30:00Z")
    expect(formatted.length).toBeGreaterThan(0)
  })
})
