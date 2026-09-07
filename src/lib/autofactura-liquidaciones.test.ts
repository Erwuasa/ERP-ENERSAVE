import { describe, expect, it } from "vitest"
import { getAutofacturaPeriodoFacturacion } from "./autofactura-scheduler"
import {
  buildAutofacturaLiquidacionFromRows,
  filterPendingAutofacturaRows,
  hasPendingAutofacturaRows,
} from "./autofactura-liquidaciones"
import type { LiquidacionInternaRow } from "./liquidaciones-internas"
import type { Settlement } from "../types/settlement"

function settlement(patch: Partial<Settlement> = {}): Settlement {
  return {
    id: "s1",
    comercialId: "c1",
    comercialName: "Ana",
    montoInterno: 100,
    montoExterno: 70,
    estado: "pendiente",
    tipo: "luz",
    descripcion: "Activación",
    createdAt: "2026-08-12",
    ...patch,
  }
}

function row(partial: Partial<LiquidacionInternaRow> & { settlement: Settlement }): LiquidacionInternaRow {
  return {
    clientName: "Cliente",
    cups: "ES0001",
    direccion: "—",
    segmento: "residencial",
    peaje: "2.0TD",
    compania: "Endesa",
    tarifa: "Plan",
    fechaActivacion: partial.settlement.createdAt,
    fechaBaja: "—",
    comision: partial.settlement.montoExterno,
    comercialId: partial.settlement.comercialId,
    comercialName: partial.settlement.comercialName,
    contractReferencia: "—",
    ...partial,
  }
}

describe("getAutofacturaPeriodoFacturacion", () => {
  it("asocia agosto al 7 de septiembre residencial (corte día 6)", () => {
    expect(getAutofacturaPeriodoFacturacion("residencial", new Date(2026, 8, 7))).toEqual({
      mes: 8,
      año: 2026,
    })
  })

  it("asocia julio al 3 de septiembre residencial (antes del corte)", () => {
    expect(getAutofacturaPeriodoFacturacion("residencial", new Date(2026, 8, 3))).toEqual({
      mes: 7,
      año: 2026,
    })
  })

  it("asocia julio al 15 de septiembre pyme (corte día 20)", () => {
    expect(getAutofacturaPeriodoFacturacion("pyme", new Date(2026, 8, 15))).toEqual({
      mes: 7,
      año: 2026,
    })
  })
})

describe("filterPendingAutofacturaRows", () => {
  const periodo = { mes: 8, año: 2026 }

  it("incluye solo pendientes del periodo y excluye pagadas/retro", () => {
    const rows = [
      row({ settlement: settlement({ id: "ok", createdAt: "2026-08-10" }) }),
      row({
        settlement: settlement({
          id: "pagada",
          createdAt: "2026-08-11",
          estado: "pagado",
        }),
      }),
      row({
        settlement: settlement({
          id: "retro",
          createdAt: "2026-08-12",
          montoExterno: -50,
          descripcion: "Retrocomisión",
        }),
      }),
      row({
        settlement: settlement({
          id: "otro-mes",
          createdAt: "2026-07-10",
        }),
      }),
    ]

    const pending = filterPendingAutofacturaRows(rows, periodo, "c1")
    expect(pending.map((item) => item.settlement.id)).toEqual(["ok"])
    expect(hasPendingAutofacturaRows(rows, periodo, "c1")).toBe(true)
  })

  it("construye liquidación solo con pendientes del periodo", () => {
    const rows = [
      row({ settlement: settlement({ id: "a", createdAt: "2026-08-05", montoExterno: 70 }) }),
      row({
        settlement: settlement({
          id: "b",
          createdAt: "2026-08-20",
          montoExterno: 30,
          montoInterno: 40,
        }),
      }),
      row({
        settlement: settlement({
          id: "c",
          createdAt: "2026-07-01",
          montoExterno: 99,
        }),
      }),
    ]

    const liquidacion = buildAutofacturaLiquidacionFromRows(rows, periodo, "c1", "Ana")
    expect(liquidacion.desglosePorContrato).toHaveLength(2)
    expect(liquidacion.totalComisionado).toBe(100)
    expect(liquidacion.desglosePorContrato.map((line) => line.contractId)).toEqual(["a", "b"])
  })
})
