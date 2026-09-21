import { describe, expect, it } from "vitest"
import * as XLSX from "xlsx"
import {
  CONTRACT_EXCEL_COLUMNS,
  importedRowsToContracts,
  parseContractsFromExcel,
} from "./excel-import"

function workbookBuffer(rows: Record<string, unknown>[]): ArrayBuffer {
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Contratos")
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer
}

describe("parseContractsFromExcel", () => {
  it("reads official template headers and does not confuse comercial with client", () => {
    const rows = parseContractsFromExcel(
      workbookBuffer([
        {
          Cliente: "María García",
          NIF: "12345678Z",
          CUPS: "ES0031408438579346AA",
          Tipo: "Luz",
          Compañía: "Iberdrola",
          Tarifa: "2.0TD",
          Estado: "PTE DE TRAMITACIÓN",
          Comercial: "Ana Pérez",
          Email: "maria@correo.es",
          Teléfono: "600123123",
          "Tipo cliente": "Residencial",
        },
      ])
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]?.clientName).toBe("María García")
    expect(rows[0]?.comercialName).toBe("Ana Pérez")
    expect(rows[0]?.nif).toBe("12345678Z")
    expect(rows[0]?.tipo).toBe("luz")
    expect(rows[0]?.email).toBe("maria@correo.es")
    expect(rows[0]?.tipoCliente).toBe("residencial")
  })

  it("does not treat comercializadora as the commercial agent", () => {
    const rows = parseContractsFromExcel(
      workbookBuffer([
        {
          "Nombre cliente": "Valcambre SL",
          CUPS: "ES001",
          Comercializadora: "Endesa",
          "Nombre comercial": "Luis Gómez",
        },
      ])
    )

    expect(rows[0]?.clientName).toBe("Valcambre SL")
    expect(rows[0]?.compania).toBe("Endesa")
    expect(rows[0]?.comercialName).toBe("Luis Gómez")
  })

  it("assigns imported contracts to the loading user", () => {
    const rows = parseContractsFromExcel(
      workbookBuffer([{ Cliente: "Demo", CUPS: "ES001", Compañía: "Iberdrola" }])
    )
    const contracts = importedRowsToContracts(rows, {
      comercialId: "user-42",
      comercialName: "German",
      existingCount: 0,
    })
    expect(contracts[0]?.comercialId).toBe("user-42")
  })

  it("keeps requiredAny columns documented for the plantilla", () => {
    const requiredAny = CONTRACT_EXCEL_COLUMNS.filter((column) => column.requiredAny).map(
      (column) => column.header
    )
    expect(requiredAny).toEqual(["Cliente", "CUPS"])
  })
})
