import { describe, expect, it } from "vitest"
import {
  contractRequiresUserAction,
  countContractsByActionTier,
  getContractActionRowClass,
} from "./contract-action-attention"
import { buildSidebarActionBadges } from "./sidebar-action-badges"

describe("contract-action-attention", () => {
  it("flags incidencia and scoring-related estados", () => {
    expect(contractRequiresUserAction("INCIDENCIA ADMINISTRATIVA")).toBe(true)
    expect(contractRequiresUserAction("TRAMITANDO")).toBe(true)
    expect(contractRequiresUserAction("ACTIVADO")).toBe(false)
  })

  it("returns estado-colored row classes", () => {
    expect(getContractActionRowClass("FIRMA CADUCADA")).toContain("orange")
    expect(getContractActionRowClass("INCIDENCIA ADMINISTRATIVA")).toContain("violet")
  })

  it("counts by tier", () => {
    const counts = countContractsByActionTier([
      { estado: "INCIDENCIA ADMINISTRATIVA" },
      { estado: "PTE DE FIRMA" },
      { estado: "ACTIVADO" },
    ])
    expect(counts).toEqual({ urgent: 1, attention: 1, pending: 0 })
  })
})

describe("sidebar-action-badges", () => {
  it("shows orange badge only for incidencias del usuario activo", () => {
    const badges = buildSidebarActionBadges(["Contratos"], {
      contracts: [
        { estado: "INCIDENCIA ADMINISTRATIVA", comercialId: "usr-3" },
        { estado: "INCIDENCIA ADMINISTRATIVA", comercialId: "usr-9" },
        { estado: "PTE DE FIRMA", comercialId: "usr-3" },
        { estado: "ACTIVADO", comercialId: "usr-3" },
      ],
      incidencias: [],
      settlements: [],
      activeUserId: "usr-3",
      activeRole: "comercial",
      superadminViewMode: "comercial",
    })
    expect(badges.Contratos).toEqual({ count: 1, tone: "attention" })
  })

  it("no muestra badge por PTE FIRMA u otros estados", () => {
    const badges = buildSidebarActionBadges(["Contratos"], {
      contracts: [{ estado: "PTE DE FIRMA", comercialId: "usr-3" }],
      incidencias: [],
      settlements: [],
      activeUserId: "usr-3",
      activeRole: "comercial",
      superadminViewMode: "comercial",
    })
    expect(badges.Contratos).toBeUndefined()
  })

  it("shows red badge for critical incidencias", () => {
    const badges = buildSidebarActionBadges(["Incidencias"], {
      contracts: [],
      incidencias: [
        {
          id: "1",
          codigo: "INC-0001",
          clientName: "A",
          tipo: "Error de CUPS",
          prioridad: "critica",
          estado: "abierto",
          origen: "manual",
          comercialId: "usr-3",
          comercialName: "Test",
          descripcion: "",
          historialEstados: [],
        },
      ],
      settlements: [],
      activeUserId: "usr-3",
      activeRole: "comercial",
      superadminViewMode: "comercial",
    })
    expect(badges.Incidencias).toEqual({ count: 1, tone: "urgent" })
  })
})
