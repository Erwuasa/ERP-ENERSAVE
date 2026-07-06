import { describe, expect, it } from "vitest"
import type { Prospecto, TareaVenta } from "../../lib/ventas/types"
import { buildTareasByProspecto, filterProspectos } from "./ventas-ui"

const baseProspecto = (overrides: Partial<Prospecto> = {}): Prospecto => ({
  id: "p1",
  comercialId: "c1",
  comercialName: "Comercial Test",
  nombre: "Test Negocio",
  fase: "prospecto_nuevo",
  faseChangedAt: new Date(Date.now() - 5 * 3_600_000).toISOString(),
  diasEnFase: 0,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
})

describe("buildTareasByProspecto", () => {
  it("returns first pendiente tarea per prospecto", () => {
    const tareas: TareaVenta[] = [
      {
        id: "t1",
        prospectoId: "p1",
        comercialId: "c1",
        tipo: "llamada_seguimiento",
        estado: "completada",
        prioridad: "media",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "t2",
        prospectoId: "p1",
        comercialId: "c1",
        tipo: "primer_contacto",
        estado: "pendiente",
        prioridad: "alta",
        titulo: "Llamar hoy",
        createdAt: "2026-01-02T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
      },
    ]

    const map = buildTareasByProspecto(tareas)
    expect(map.get("p1")?.id).toBe("t2")
  })
})

describe("filterProspectos", () => {
  const prospectos = [
    baseProspecto({
      id: "p1",
      fase: "prospecto_nuevo",
      subtipoProspecto: "referido",
      metadata: { lead_digital: true },
      faseChangedAt: new Date(Date.now() - 5 * 3_600_000).toISOString(),
    }),
    baseProspecto({
      id: "p2",
      fase: "contactado",
      subtipoProspecto: "base_datos",
      comercialId: "c2",
    }),
  ]

  const tareas: TareaVenta[] = [
    {
      id: "t1",
      prospectoId: "p1",
      comercialId: "c1",
      tipo: "primer_contacto",
      estado: "pendiente",
      prioridad: "alta",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ]

  const tareasMap = buildTareasByProspecto(tareas)

  it("filters by fase", () => {
    const result = filterProspectos(prospectos, { fase: "contactado" }, tareasMap)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("p2")
  })

  it("filters by sla breach on prospecto_nuevo past SLA", () => {
    const result = filterProspectos(prospectos, { slaBreach: true }, tareasMap)
    expect(result.some((p) => p.id === "p1")).toBe(true)
  })
})
