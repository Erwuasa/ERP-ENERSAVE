import { describe, expect, it } from "vitest"
import {
  getProspectoEtiquetas,
  getProspectoEtiquetaContacto,
  getProspectoNotasInternas,
} from "./prospecto-display"
import type { Prospecto } from "./types"

const baseProspecto: Prospecto = {
  id: "p-1",
  comercialId: "staff-ignacio",
  comercialName: "Test",
  nombre: "Cliente",
  fase: "prospecto_nuevo",
  faseChangedAt: "2026-06-01T00:00:00Z",
  diasEnFase: 0,
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
}

describe("prospecto-display", () => {
  it("reads etiquetas from metadata array", () => {
    const tags = getProspectoEtiquetas({
      ...baseProspecto,
      metadata: { etiquetas: ["Mi primo", "Zona norte"] },
    })
    expect(tags).toEqual(["Mi primo", "Zona norte"])
  })

  it("reads free-text canal origen as etiqueta", () => {
    const etiqueta = getProspectoEtiquetaContacto({
      ...baseProspecto,
      metadata: { canal_origen: "Referido de parte de mi primo" },
    })
    expect(etiqueta).toBe("Referido de parte de mi primo")
  })

  it("reads notas internas from metadata", () => {
    const notas = getProspectoNotasInternas({
      ...baseProspecto,
      metadata: { notas_internas: "Llamar por la tarde" },
    })
    expect(notas).toBe("Llamar por la tarde")
  })
})
