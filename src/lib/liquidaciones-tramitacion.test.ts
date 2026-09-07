import { describe, expect, it } from "vitest"
import type { AutofacturaRecord } from "../types/autofactura-record"
import type { Settlement } from "../types/settlement"
import type { Alegacion } from "../types/alegacion"
import type { LiquidacionInternaRow } from "./liquidaciones-internas"
import {
  buildAlegacionGestionRows,
  buildAutofacturaGestionItems,
  comercialMatchesAdminScope,
  filterAutofacturaRecordsForGestion,
  resolveAutofacturaGestionEstado,
} from "./liquidaciones-tramitacion"

function settlement(id: string, estado: Settlement["estado"] = "pendiente"): Settlement {
  return {
    id,
    comercialId: "c1",
    comercialName: "Ana",
    montoInterno: 100,
    montoExterno: 70,
    estado,
    tipo: "luz",
    descripcion: "Activación",
    createdAt: "2026-08-10",
  }
}

function row(id: string, comercialId = "c1"): LiquidacionInternaRow {
  return {
    settlement: settlement(id),
    clientName: "Cliente",
    cups: "ES0001",
    direccion: "—",
    segmento: "residencial",
    peaje: "2.0TD",
    compania: "Endesa",
    tarifa: "Plan",
    fechaActivacion: "2026-08-10",
    fechaBaja: "—",
    comision: 70,
    comercialId,
    comercialName: "Ana",
    contractReferencia: "—",
  }
}

describe("buildAlegacionGestionRows", () => {
  it("prioriza abiertas y excluye resueltas", () => {
    const rows = [row("s1"), row("s2"), row("s3")]
    const alegaciones = new Map<string, Alegacion>([
      [
        "s1",
        {
          id: "a1",
          settlementId: "s1",
          contractId: "ct1",
          comercialId: "c1",
          estado: "en_revision",
          mensajes: [],
          creadaEn: "2026-09-01T10:00:00Z",
        },
      ],
      [
        "s2",
        {
          id: "a2",
          settlementId: "s2",
          contractId: "ct2",
          comercialId: "c1",
          estado: "abierta",
          mensajes: [],
          creadaEn: "2026-09-02T10:00:00Z",
        },
      ],
      [
        "s3",
        {
          id: "a3",
          settlementId: "s3",
          contractId: "ct3",
          comercialId: "c1",
          estado: "resuelta",
          mensajes: [],
          creadaEn: "2026-09-03T10:00:00Z",
        },
      ],
    ])

    const result = buildAlegacionGestionRows(rows, alegaciones)
    expect(result.map((item) => item.settlement.id)).toEqual(["s2", "s1"])
  })
})

describe("resolveAutofacturaGestionEstado", () => {
  it("marca pendiente si alguna liquidación origen sigue pendiente", () => {
    const record: AutofacturaRecord = {
      id: "af1",
      comercialId: "c1",
      comercialName: "Ana",
      periodoMes: 8,
      periodoAnio: 2026,
      settlementIds: ["s1", "s2"],
      totalComisionado: 140,
      generatedAt: "2026-09-06T09:00:00Z",
    }
    const settlementsById = new Map([
      ["s1", settlement("s1", "pagado")],
      ["s2", settlement("s2", "pendiente")],
    ])

    expect(resolveAutofacturaGestionEstado(record, settlementsById)).toBe("pendiente")
  })

  it("marca procesada cuando todas están pagadas", () => {
    const record: AutofacturaRecord = {
      id: "af1",
      comercialId: "c1",
      comercialName: "Ana",
      periodoMes: 8,
      periodoAnio: 2026,
      settlementIds: ["s1"],
      totalComisionado: 70,
      generatedAt: "2026-09-06T09:00:00Z",
    }
    const settlementsById = new Map([["s1", settlement("s1", "pagado")]])

    expect(resolveAutofacturaGestionEstado(record, settlementsById)).toBe("procesada")
  })
})

describe("filterAutofacturaRecordsForGestion", () => {
  const records: AutofacturaRecord[] = [
    {
      id: "af1",
      comercialId: "c1",
      comercialName: "Ana",
      periodoMes: 8,
      periodoAnio: 2026,
      settlementIds: ["s1"],
      totalComisionado: 70,
      generatedAt: "2026-09-06T09:00:00Z",
    },
    {
      id: "af2",
      comercialId: "c2",
      comercialName: "Luis",
      periodoMes: 7,
      periodoAnio: 2026,
      settlementIds: ["s2"],
      totalComisionado: 50,
      generatedAt: "2026-08-06T09:00:00Z",
    },
  ]

  it("filtra por comercial y rango de fechas del periodo", () => {
    const filtered = filterAutofacturaRecordsForGestion(records, {
      profiles: [
        { id: "c1", fullName: "Ana", role: "comercial" },
        { id: "c2", fullName: "Luis", role: "comercial" },
      ],
      adminScopeMode: "comercial",
      adminScopeTargetId: "c1",
      dateFrom: "2026-08-01",
      dateTo: "2026-09-30",
    })

    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.id).toBe("af1")
  })
})

describe("comercialMatchesAdminScope", () => {
  const profiles = [
    { id: "dir1", fullName: "Director", role: "jefe_comercial" },
    { id: "c1", fullName: "Ana", role: "comercial", managerId: "dir1" },
    { id: "c2", fullName: "Luis", role: "comercial", managerId: "dir1" },
  ]

  it("limita al equipo del director", () => {
    expect(comercialMatchesAdminScope("c1", profiles, "equipo", "dir1")).toBe(true)
    expect(comercialMatchesAdminScope("c2", profiles, "equipo", "dir1")).toBe(true)
    expect(comercialMatchesAdminScope("c1", profiles, "equipo", "other")).toBe(false)
  })
})

describe("buildAutofacturaGestionItems", () => {
  it("ordena pendientes antes que procesadas", () => {
    const records: AutofacturaRecord[] = [
      {
        id: "af-done",
        comercialId: "c1",
        comercialName: "Ana",
        periodoMes: 8,
        periodoAnio: 2026,
        settlementIds: ["s-done"],
        totalComisionado: 70,
        generatedAt: "2026-09-07T09:00:00Z",
      },
      {
        id: "af-pending",
        comercialId: "c1",
        comercialName: "Ana",
        periodoMes: 8,
        periodoAnio: 2026,
        settlementIds: ["s-pending"],
        totalComisionado: 70,
        generatedAt: "2026-09-06T09:00:00Z",
      },
    ]

    const items = buildAutofacturaGestionItems(records, [
      settlement("s-done", "pagado"),
      settlement("s-pending", "pendiente"),
    ])

    expect(items.map((item) => item.record.id)).toEqual(["af-pending", "af-done"])
  })
})
