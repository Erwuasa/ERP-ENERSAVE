import { describe, expect, it } from "vitest"
import {
  filterTimelineActividades,
  getActividadBubbleText,
  isChatActividad,
  sortActividadesForChat,
} from "./actividad-chat"
import type { ActividadVenta } from "./types"

function actividad(partial: Partial<ActividadVenta> & Pick<ActividadVenta, "tipo">): ActividadVenta {
  return {
    id: partial.id ?? "a1",
    prospectoId: "p1",
    comercialId: "c1",
    comercialName: "Comercial",
    titulo: partial.titulo ?? null,
    descripcion: partial.descripcion ?? null,
    metadata: partial.metadata ?? null,
    createdAt: partial.createdAt ?? "2026-06-01T10:00:00Z",
    tipo: partial.tipo,
  }
}

describe("actividad-chat", () => {
  it("treats nota and llamada as chat messages", () => {
    expect(isChatActividad(actividad({ tipo: "nota" }))).toBe(true)
    expect(isChatActividad(actividad({ tipo: "cambio_fase" }))).toBe(false)
  })

  it("sorts chat timeline ascending by createdAt", () => {
    const sorted = sortActividadesForChat([
      actividad({ id: "2", tipo: "nota", createdAt: "2026-06-02T10:00:00Z" }),
      actividad({ id: "1", tipo: "nota", createdAt: "2026-06-01T10:00:00Z" }),
    ])
    expect(sorted.map((a) => a.id)).toEqual(["1", "2"])
  })

  it("filters to chat and system types only", () => {
    const filtered = filterTimelineActividades([
      actividad({ tipo: "nota" }),
      actividad({ tipo: "cambio_fase", descripcion: "A contactado" }),
      actividad({ tipo: "tarea_completada" as ActividadVenta["tipo"] }),
    ])
    expect(filtered.length).toBe(2)
  })

  it("prefers descripcion over titulo in bubble text", () => {
    expect(
      getActividadBubbleText(
        actividad({ tipo: "nota", titulo: "Reporte", descripcion: "Cliente interesado" })
      )
    ).toBe("Cliente interesado")
  })
})
