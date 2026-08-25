import { describe, expect, it } from "vitest"
import { buildSlaAlerts } from "./sla-alerts"
import type { Prospecto } from "./types"
import type { VentasActor } from "./hooks/types"

function prospecto(
  id: string,
  comercialId: string,
  fase: Prospecto["fase"] = "prospecto_nuevo",
  faseChangedAt = "2020-01-01T00:00:00Z"
): Prospecto {
  return {
    id,
    comercialId,
    comercialName: "Test",
    nombre: `P-${id}`,
    fase,
    faseChangedAt,
    diasEnFase: 0,
    createdAt: faseChangedAt,
    updatedAt: faseChangedAt,
  }
}

const comercialActor: VentasActor = {
  comercialId: "usr-3",
  comercialName: "Ignacio",
  role: "comercial",
}

describe("buildSlaAlerts", () => {
  it("returns breach for comercial own prospect past SLA", () => {
    const alerts = buildSlaAlerts(
      [prospecto("a", "usr-3"), prospecto("b", "usr-4")],
      comercialActor,
      []
    )
    expect(alerts.some((a) => a.prospecto.id === "a")).toBe(true)
    expect(alerts.some((a) => a.prospecto.id === "b")).toBe(false)
  })

  it("includes team breaches for jefe comercial", () => {
    const jefe: VentasActor = {
      comercialId: "usr-2",
      comercialName: "Elena",
      role: "jefe_comercial",
    }
    const alerts = buildSlaAlerts(
      [prospecto("a", "usr-3"), prospecto("b", "usr-4")],
      jefe,
      ["usr-3", "usr-4"]
    )
    expect(alerts.length).toBe(2)
  })

  it("skips activado and descartado", () => {
    const alerts = buildSlaAlerts(
      [
        prospecto("a", "usr-3", "activado"),
        prospecto("b", "usr-3", "descartado"),
        prospecto("c", "usr-3", "prospecto_nuevo"),
      ],
      comercialActor,
      []
    )
    expect(alerts.length).toBe(1)
    expect(alerts[0].prospecto.id).toBe("c")
  })
})
