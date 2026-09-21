import { describe, expect, it } from "vitest"
import type { Contract } from "../types/contract"
import { canUserMutateContract, resolveVisibleContracts } from "./contract-visibility"

const own: Contract = {
  id: "c-own",
  clientName: "Own",
  cups: "ES1",
  tipo: "luz",
  compania: "Endesa",
  tarifa: "Fija",
  consumoAnual: 0,
  montoInterno: 0,
  montoExterno: 0,
  estado: "Borrador",
  comercialId: "jefe-1",
  comercialName: "Jefe",
  createdAt: "2026-01-01",
}

const team: Contract = {
  ...own,
  id: "c-team",
  clientName: "Team",
  comercialId: "com-2",
  comercialName: "Comercial",
}

const other: Contract = {
  ...own,
  id: "c-other",
  clientName: "Other",
  comercialId: "com-9",
  comercialName: "Otro",
}

describe("canUserMutateContract", () => {
  it("lets superadmin and tramitación mutate any contract", () => {
    expect(canUserMutateContract(team, "superadmin", "sa-1")).toBe(true)
    expect(canUserMutateContract(team, "tramitacion", "ops-1")).toBe(true)
  })

  it("lets jefe and comercial mutate only their own", () => {
    expect(canUserMutateContract(own, "jefe_comercial", "jefe-1")).toBe(true)
    expect(canUserMutateContract(team, "jefe_comercial", "jefe-1")).toBe(false)
    expect(canUserMutateContract(own, "comercial", "jefe-1")).toBe(true)
    expect(canUserMutateContract(team, "comercial", "jefe-1")).toBe(false)
  })
})

describe("resolveVisibleContracts", () => {
  const contracts = [own, team, other]

  it("shows only own contracts to comercial", () => {
    expect(
      resolveVisibleContracts({
        contracts,
        activeRole: "comercial",
        activeUserId: "jefe-1",
        teamMemberIds: ["com-2"],
        currentMenuTab: "Contratos",
        showOpsUserFilter: false,
        userFilterId: "all",
        teamScope: "own",
      }).map((c) => c.id)
    ).toEqual(["c-own"])
  })

  it("shows own by default and team when EQUIPO is selected for jefe", () => {
    const base = {
      contracts,
      activeRole: "jefe_comercial" as const,
      activeUserId: "jefe-1",
      teamMemberIds: ["com-2"],
      currentMenuTab: "Contratos",
      showOpsUserFilter: false,
      userFilterId: "all",
    }
    expect(resolveVisibleContracts({ ...base, teamScope: "own" }).map((c) => c.id)).toEqual([
      "c-own",
    ])
    expect(resolveVisibleContracts({ ...base, teamScope: "team" }).map((c) => c.id)).toEqual([
      "c-own",
      "c-team",
    ])
  })

  it("shows all contracts to superadmin in tramitación", () => {
    expect(
      resolveVisibleContracts({
        contracts,
        activeRole: "superadmin",
        activeUserId: "sa-1",
        teamMemberIds: [],
        currentMenuTab: "Contratos",
        showOpsUserFilter: true,
        userFilterId: "all",
        teamScope: "own",
      }).map((c) => c.id)
    ).toEqual(["c-own", "c-team", "c-other"])
  })

  it("shows only own contracts to superadmin in vista comercial", () => {
    expect(
      resolveVisibleContracts({
        contracts,
        activeRole: "superadmin",
        activeUserId: "jefe-1",
        teamMemberIds: [],
        currentMenuTab: "Contratos",
        showOpsUserFilter: false,
        userFilterId: "all",
        teamScope: "own",
      }).map((c) => c.id)
    ).toEqual(["c-own"])
  })
})
