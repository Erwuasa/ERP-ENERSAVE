import { describe, expect, it } from "vitest"
import {
  calendarioMentionCandidates,
  calendarioMentionHandle,
  canAccessErpCalendario,
  eventoMatchesCalendarioUsers,
  normalizeCalendarioMenciones,
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

  it("arma el identificador de mención sin espacios", () => {
    expect(calendarioMentionHandle("Ricardo Monsalve")).toBe("RicardoMonsalve")
  })

  it("un comercial ve el evento si lo mencionan, aunque no sea suyo", () => {
    const scope = resolveCalendarioScopeUserIds("comercial", "c1", profiles)
    const mencionado = { usuarioId: "x", menciones: ["c1"] }
    const ajeno = { usuarioId: "x", menciones: ["c2"] }
    expect(eventoMatchesCalendarioUsers(mencionado, scope)).toBe(true)
    expect(eventoMatchesCalendarioUsers(ajeno, scope)).toBe(false)
  })

  it("el selector no ofrece al dueño ni a tramitación", () => {
    const withTramitacion = [
      ...profiles,
      { id: "tram", fullName: "Trami", role: "tramitacion", managerId: null },
    ]
    expect(calendarioMentionCandidates(withTramitacion, "c1").map((user) => user.id)).toEqual([
      "x",
      "c2",
      "boss",
      "other",
    ])
    expect(
      normalizeCalendarioMenciones(["c1", "c2", "c2", "tram"], "c1", new Set(["c2", "boss"]))
    ).toEqual(["c2"])
  })
})
