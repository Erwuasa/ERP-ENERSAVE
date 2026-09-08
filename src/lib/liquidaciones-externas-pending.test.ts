import { describe, expect, it } from "vitest"
import {
  buildPendingLiquidacionContractsFromSettlements,
  isSettlementEligibleForExternasConsolidation,
} from "@/lib/liquidaciones-externas-pending"
import type { Contract } from "@/types/contract"
import type { Settlement } from "@/types/settlement"

const contract: Contract = {
  id: "con-1",
  clientName: "Cliente Demo",
  cups: "ES0021000002359672001KF",
  tipo: "luz",
  compania: "Endesa",
  tarifa: "Fijo",
  consumoAnual: 1000,
  montoInterno: 380,
  montoExterno: 190,
  estado: "ACTIVADO",
  comercialId: "staff-ignacio",
  comercialName: "Ignacio Ortiz",
  createdAt: "2025-04-14",
  direccionSuministro: "Valencia",
}

const pendingSettlement: Settlement = {
  id: "liq-pending",
  comercialId: "staff-ignacio",
  comercialName: "Ignacio Ortiz",
  montoInterno: 380,
  montoExterno: 190,
  estado: "pendiente",
  tipo: "luz",
  descripcion: "Comisión pendiente",
  createdAt: "2026-06-04",
  contractId: "con-1",
  tipoEvento: "activacion",
}

describe("liquidaciones-externas-pending", () => {
  it("expone settlements ERP pendientes con importe distinto de cero", () => {
    expect(isSettlementEligibleForExternasConsolidation(pendingSettlement)).toBe(true)
    expect(
      isSettlementEligibleForExternasConsolidation({ ...pendingSettlement, estado: "pagado" })
    ).toBe(false)
    expect(
      isSettlementEligibleForExternasConsolidation({
        ...pendingSettlement,
        source: "at",
      })
    ).toBe(false)
    expect(
      isSettlementEligibleForExternasConsolidation({
        ...pendingSettlement,
        tipoEvento: "retrocomision",
        montoInterno: -50,
        montoExterno: -50,
      })
    ).toBe(true)
    expect(
      isSettlementEligibleForExternasConsolidation({
        ...pendingSettlement,
        montoInterno: 0,
      })
    ).toBe(false)
  })

  it("mapea settlements pendientes a contratos de externas", () => {
    const checked = new Set(["liq-pending"])
    const rows = buildPendingLiquidacionContractsFromSettlements(
      [pendingSettlement],
      [contract],
      checked
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: "liq-pending",
      settlementId: "liq-pending",
      contractId: "con-1",
      brand: "Endesa",
      price: 380,
      checked: true,
      clientName: "Cliente Demo",
    })
  })
})
