import { describe, expect, it } from "vitest"
import type { Settlement } from "../types/settlement"
import type { Contract } from "../types/contract"
import {
  applyActivationSettlements,
  buildPendingContractSettlement,
  findContractCommissionSettlement,
} from "./contract-settlements"

const baseContract: Contract = {
  id: "con-1",
  clientName: "Cliente Demo",
  cups: "ES0021000000000001AB",
  tipo: "luz",
  compania: "Repsol",
  tarifa: "Tarifa X",
  consumoAnual: 5000,
  montoInterno: 50,
  montoExterno: 35,
  estado: "PTE DE FIRMA",
  comercialId: "usr-3",
  comercialName: "Ignacio Ortiz",
  createdAt: "2026-06-01",
}

describe("contract-settlements", () => {
  it("buildPendingContractSettlement crea comisión provisional pendiente", () => {
    const settlement = buildPendingContractSettlement({
      id: "liq-1",
      contractId: "con-1",
      comercialId: "usr-3",
      comercialName: "Ignacio Ortiz",
      montoInterno: 50,
      montoExterno: 35,
      tipo: "luz",
      clientName: "Cliente Demo",
      createdAt: "2026-06-01",
    })

    expect(settlement.estado).toBe("pendiente")
    expect(settlement.descripcion).toContain("pendiente de confirmación")
    expect(settlement.contractId).toBe("con-1")
  })

  it("applyActivationSettlements actualiza la liquidación existente del comercial", () => {
    const pending = buildPendingContractSettlement({
      id: "liq-1",
      contractId: "con-1",
      comercialId: "usr-3",
      comercialName: "Ignacio Ortiz",
      montoInterno: 50,
      montoExterno: 35,
      tipo: "luz",
      clientName: "Cliente Demo",
      createdAt: "2026-06-01",
    })

    const result = applyActivationSettlements([pending], {
      contract: baseContract,
      commissionPct: 70,
      totalCom: 120,
      comercialShare: 84,
      jefeShare: 0,
      managerId: null,
      managerName: null,
      activationDate: "2026-06-15",
    })

    expect(result.creates).toHaveLength(0)
    expect(result.updates).toHaveLength(1)
    expect(result.updates[0]?.id).toBe("liq-1")
    expect(result.updates[0]?.patch.montoExterno).toBe(84)

    const updated = findContractCommissionSettlement(result.settlements, "con-1", "usr-3")
    expect(updated?.montoExterno).toBe(84)
    expect(updated?.descripcion).toContain("confirmada")
  })

  it("applyActivationSettlements crea override de jefe si no existía fila previa", () => {
    const pending = buildPendingContractSettlement({
      id: "liq-1",
      contractId: "con-1",
      comercialId: "usr-3",
      comercialName: "Ignacio Ortiz",
      montoInterno: 50,
      montoExterno: 35,
      tipo: "luz",
      clientName: "Cliente Demo",
      createdAt: "2026-06-01",
    })

    const result = applyActivationSettlements([pending], {
      contract: baseContract,
      commissionPct: 70,
      totalCom: 120,
      comercialShare: 84,
      jefeShare: 12,
      managerId: "usr-2",
      managerName: "Elena Garrido",
      activationDate: "2026-06-15",
    })

    expect(result.updates).toHaveLength(1)
    expect(result.creates).toHaveLength(1)
    expect(result.creates[0]?.comercialId).toBe("usr-2")

    const jefe = findContractCommissionSettlement(result.settlements, "con-1", "usr-2")
    expect(jefe?.montoExterno).toBe(12)
  })

  it("no duplica si ya existe liquidación de comercial", () => {
    const existing: Settlement[] = [
      {
        id: "liq-1",
        contractId: "con-1",
        comercialId: "usr-3",
        comercialName: "Ignacio Ortiz",
        montoInterno: 50,
        montoExterno: 35,
        estado: "pendiente",
        tipo: "luz",
        descripcion: "Comisión pendiente de confirmación — Cliente Demo",
        createdAt: "2026-06-01",
      },
    ]

    const result = applyActivationSettlements(existing, {
      contract: baseContract,
      commissionPct: 70,
      totalCom: 120,
      comercialShare: 84,
      jefeShare: 0,
      managerId: null,
      managerName: null,
      activationDate: "2026-06-15",
    })

    expect(result.settlements.filter((s) => s.comercialId === "usr-3")).toHaveLength(1)
  })
})
