import { describe, expect, it } from "vitest"
import {
  aggregateDescartesByMotivo,
  computeFunnelMetrics,
  filterProspectosForReportingScope,
} from "./reporting-ui"
import type { VentasActor } from "./hooks/types"
import type { Prospecto } from "./types"

function prospecto(
  partial: Partial<Prospecto> & Pick<Prospecto, "id" | "fase" | "comercialId">
): Prospecto {
  return {
    nombre: "Test",
    comercialName: "Comercial",
    faseChangedAt: "2026-06-01",
    diasEnFase: 1,
    createdAt: "2026-06-01",
    updatedAt: "2026-06-01",
    ...partial,
  }
}

describe("reporting-ui", () => {
  it("computeFunnelMetrics excludes archivo fases and computes adjacent conversion", () => {
    const rows = [
      prospecto({ id: "1", fase: "tramitacion", comercialId: "c1" }),
      prospecto({ id: "2", fase: "pendiente_firma", comercialId: "c1" }),
      prospecto({ id: "3", fase: "descartado", comercialId: "c1", motivoDescarte: "otro" }),
    ]
    const funnel = computeFunnelMetrics(rows)
    const tram = funnel.find((f) => f.fase === "tramitacion")
    const pend = funnel.find((f) => f.fase === "pendiente_firma")
    expect(tram?.count).toBe(1)
    expect(pend?.count).toBe(1)
    expect(tram?.conversionToNextPct).toBe(100)
    expect(funnel.find((f) => f.fase === "descartado")).toBeUndefined()
  })

  it("aggregateDescartesByMotivo counts by motivo", () => {
    const rows = [
      prospecto({
        id: "1",
        fase: "descartado",
        comercialId: "c1",
        motivoDescarte: "no_interesado",
      }),
      prospecto({
        id: "2",
        fase: "descartado",
        comercialId: "c1",
        motivoDescarte: "no_interesado",
      }),
    ]
    const agg = aggregateDescartesByMotivo(rows)
    expect(agg).toHaveLength(1)
    expect(agg[0].motivo).toBe("no_interesado")
    expect(agg[0].count).toBe(2)
  })

  it("filterProspectosForReportingScope scopes by role", () => {
    const actor: VentasActor = {
      comercialId: "jefe",
      comercialName: "Jefe",
      role: "jefe_comercial",
    }
    const rows = [
      prospecto({ id: "1", fase: "contactado", comercialId: "jefe" }),
      prospecto({ id: "2", fase: "contactado", comercialId: "c2" }),
      prospecto({ id: "3", fase: "contactado", comercialId: "c3" }),
    ]
    const scoped = filterProspectosForReportingScope(rows, actor, ["c2"])
    expect(scoped.map((p) => p.id)).toEqual(["1", "2"])
    const comercialActor: VentasActor = {
      comercialId: "c2",
      comercialName: "C2",
      role: "comercial",
    }
    expect(
      filterProspectosForReportingScope(rows, comercialActor, []).map((p) => p.id)
    ).toEqual(["2"])
  })
})
