import { describe, expect, it } from "vitest"
import {
  formatTramitacionNuevosSummary,
  groupUnreviewedTramitacionByComercial,
  isTramitacionPendingReviewEstado,
  pruneInsertBuffer,
  pushInsertBufferEvent,
} from "./contratos-tramitacion-notifications"
import type { Contract } from "../types/contract"

function contract(partial: Partial<Contract> & Pick<Contract, "id">): Contract {
  return {
    clientName: "Cliente",
    cups: "ES0021000000000000000000",
    tipo: "luz",
    compania: "Endesa",
    tarifa: "One",
    consumoAnual: 3000,
    montoInterno: 0,
    montoExterno: 0,
    estado: "PTE DE TRAMITACIÓN",
    comercialId: "c1",
    comercialName: "Alejandro Rueda",
    createdAt: "2026-01-01",
    ...partial,
  }
}

describe("isTramitacionPendingReviewEstado", () => {
  it("acepta estados legacy Temporal y Pendiente de info.", () => {
    expect(isTramitacionPendingReviewEstado("Temporal")).toBe(true)
    expect(isTramitacionPendingReviewEstado("Pendiente de info.")).toBe(true)
  })

  it("rechaza activado", () => {
    expect(isTramitacionPendingReviewEstado("ACTIVADO")).toBe(false)
  })
})

describe("formatTramitacionNuevosSummary", () => {
  it("formatea resumen agrupado por comercial", () => {
    const summary = formatTramitacionNuevosSummary([
      { comercialId: "a", comercialName: "Alejandro Rueda", count: 2 },
      { comercialId: "b", comercialName: "Ricardo Monsalve", count: 2 },
    ])
    expect(summary).toBe(
      "4 contratos nuevos — 2 de Alejandro Rueda, 2 de Ricardo Monsalve"
    )
  })
})

describe("groupUnreviewedTramitacionByComercial", () => {
  it("excluye contratos ya revisados", () => {
    const groups = groupUnreviewedTramitacionByComercial(
      [
        contract({ id: "1", comercialId: "a", comercialName: "Alejandro Rueda" }),
        contract({ id: "2", comercialId: "a", comercialName: "Alejandro Rueda" }),
        contract({ id: "3", comercialId: "b", comercialName: "Ricardo Monsalve" }),
      ],
      new Set(["3"])
    )
    expect(groups).toEqual([
      { comercialId: "a", comercialName: "Alejandro Rueda", count: 2 },
    ])
  })
})

describe("insert buffer", () => {
  it("podan eventos fuera de la ventana", () => {
    const now = Date.now()
    const pruned = pruneInsertBuffer(
      [
        {
          contractId: "old",
          comercialId: "a",
          comercialName: "A",
          insertedAt: now - 4 * 60 * 1000,
        },
        {
          contractId: "new",
          comercialId: "b",
          comercialName: "B",
          insertedAt: now - 30 * 1000,
        },
      ],
      3 * 60 * 1000
    )
    expect(pruned.map((e) => e.contractId)).toEqual(["new"])
  })

  it("acumula inserts recientes", () => {
    const now = Date.now()
    const next = pushInsertBufferEvent(
      [],
      {
        contractId: "1",
        comercialId: "a",
        comercialName: "A",
        insertedAt: now,
      },
      3 * 60 * 1000
    )
    expect(next).toHaveLength(1)
  })
})
