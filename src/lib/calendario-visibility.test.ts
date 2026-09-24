import { describe, expect, it } from "vitest"
import {
  canAccessErpCalendario,
  resolveCalendarioScopeUserIds,
  showCalendarioUserFilter,
} from "./calendario-visibility"

const profiles = [
  { id: "boss", fullName: "Jefe", role: "jefe_comercial", managerId: null },
  { id: "c1", fullName: "Comercial 1", role: "comercial", managerId: "boss" },
  { id: "c2", fullName: "Comercial 2", role: "comercial", managerId: "boss" },
  { id: "other", fullName: "Otro jefe", role: "jefe_comercial", managerId: null },
  { id: "x", fullName: "Ajeno", role: "comercial", managerId: "other" },
]

describe("calendario-visibility", () => {
  it("tramitación no accede al calendario ERP", () => {
    expect(canAccessErpCalendario("tramitacion")).toBe(false)
  })

  it("solo superadmin ve filtro de usuarios", () => {
    expect(showCalendarioUserFilter("superadmin")).toBe(true)
    expect(showCalendarioUserFilter("jefe_comercial")).toBe(false)
    expect(showCalendarioUserFilter("comercial")).toBe(false)
  })

  it("jefe ve su id y su equipo", () => {
    const scope = resolveCalendarioScopeUserIds("jefe_comercial", "boss", profiles)
    expect([...scope].sort()).toEqual(["boss", "c1", "c2"])
  })

  it("comercial solo ve su id", () => {
    const scope = resolveCalendarioScopeUserIds("comercial", "c1", profiles)
    expect([...scope]).toEqual(["c1"])
  })
})
