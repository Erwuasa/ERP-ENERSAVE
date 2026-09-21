import { describe, expect, it } from "vitest"
import { scopeDashboardData } from "./dashboard-scope"
import type { Contract } from "@/types/contract"
import type { Settlement } from "@/types/settlement"
import type { Profile } from "@/types/profile"
import type { IncidenciaTicket } from "@/lib/incidencias"

function contract(id: string, comercialId: string): Contract {
  return {
    id,
    comercialId,
    comercialName: "Comercial",
    clientName: "Cliente",
    cups: "ES000",
    compania: "Endesa",
    estado: "ACTIVADO",
    montoInterno: 100,
    montoExterno: 80,
    createdAt: "2026-01-01",
  } as Contract
}

describe("scopeDashboardData", () => {
  const profiles: Profile[] = [
    {
      id: "jefe-1",
      fullName: "Jefe",
      role: "jefe_comercial",
      managerId: null,
      permissions: {
        contractsView: true,
        comparatorAccess: true,
        quickSettlement: false,
        exportDatabase: false,
        viewRetrocommissions: true,
      },
      email: "jefe@test.com",
      status: "activo",
      commissionPercentage: 85,
    },
    {
      id: "com-1",
      fullName: "Comercial",
      role: "comercial",
      managerId: "jefe-1",
      permissions: {
        contractsView: true,
        comparatorAccess: true,
        quickSettlement: false,
        exportDatabase: false,
        viewRetrocommissions: false,
      },
      email: "com@test.com",
      status: "activo",
      commissionPercentage: 60,
    },
  ]

  const contracts = [contract("c1", "com-1"), contract("c2", "jefe-1"), contract("c3", "other")]

  it("filtra contratos del comercial a su cartera", () => {
    const scoped = scopeDashboardData("comercial", "com-1", profiles, contracts, [], [])
    expect(scoped.contracts.map((item) => item.id)).toEqual(["c1"])
  })

  it("incluye contratos del equipo para jefe comercial", () => {
    const scoped = scopeDashboardData("jefe_comercial", "jefe-1", profiles, contracts, [], [])
    expect(scoped.contracts.map((item) => item.id).sort()).toEqual(["c1", "c2"])
  })

  it("superadmin ve todos los contratos", () => {
    const scoped = scopeDashboardData("superadmin", "admin-1", profiles, contracts, [], [])
    expect(scoped.contracts).toHaveLength(3)
  })
})
