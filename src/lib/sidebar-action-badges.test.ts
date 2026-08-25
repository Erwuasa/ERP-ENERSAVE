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
  it("shows orange badge for contratos with incidencia", () => {
    const badges = buildSidebarActionBadges(["Contratos"], {
      contracts: [
        { estado: "INCIDENCIA ADMINISTRATIVA" },
        { estado: "INCIDENCIA ADMINISTRATIVA" },
        { estado: "ACTIVADO" },
      ],
      incidencias: [],
      settlements: [],
      activeUserId: "usr-3",
    })
    expect(badges.Contratos).toEqual({ count: 2, tone: "attention" })
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
    })
    expect(badges.Incidencias).toEqual({ count: 1, tone: "urgent" })
  })
})
