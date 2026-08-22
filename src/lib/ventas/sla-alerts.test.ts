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
  comercialId: "staff-ignacio",
  comercialName: "Ignacio",
  role: "comercial",
}

describe("buildSlaAlerts", () => {
  it("returns breach for comercial own prospect past SLA", () => {
    const alerts = buildSlaAlerts(
      [prospecto("a", "staff-ignacio"), prospecto("b", "staff-marta")],
      comercialActor,
      []
    )
    expect(alerts.some((a) => a.prospecto.id === "a")).toBe(true)
    expect(alerts.some((a) => a.prospecto.id === "b")).toBe(false)
  })

  it("includes team breaches for jefe comercial", () => {
    const jefe: VentasActor = {
      comercialId: "staff-elena",
      comercialName: "Elena",
      role: "jefe_comercial",
    }
    const alerts = buildSlaAlerts(
      [prospecto("a", "staff-ignacio"), prospecto("b", "staff-marta")],
      jefe,
      ["staff-ignacio", "staff-marta"]
    )
    expect(alerts.length).toBe(2)
  })

  it("skips activado and descartado", () => {
    const alerts = buildSlaAlerts(
      [
        prospecto("a", "staff-ignacio", "activado"),
        prospecto("b", "staff-ignacio", "descartado"),
        prospecto("c", "staff-ignacio", "prospecto_nuevo"),
      ],
      comercialActor,
      []
    )
    expect(alerts.length).toBe(1)
    expect(alerts[0].prospecto.id).toBe("c")
  })
})
