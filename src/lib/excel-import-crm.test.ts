import { describe, expect, it } from "vitest"
import * as XLSX from "xlsx"
import { parseContractsFromExcel } from "./excel-import"
import { resolveImportComercialForCups } from "./contract-import-cups-assign"

function crmWorkbookBuffer(): ArrayBuffer {
  const headers = [
    "Estado",
    "Fecha alta",
    "DNI CIF",
    "Cliente",
    "CUPS",
    "Compañía",
    "Producto",
    "Tarifa",
    "Oferta",
    "Potencia",
    "Consumo",
    "Comisión",
    "Pagado",
    "Puntos",
    "Teléfono",
    "Dirección",
    "C.P.",
    "Población",
    "Provincia",
  ]
  const row = [
    "Activo",
    "29/09/2026",
    "27778991M",
    "HELIOS 1969 S.L.",
    "ES0031105723137003LW",
    "GANA ENERGIA",
    "Luz",
    "2.0TD",
    "TARIFA 24 HORAS",
    9.2,
    0,
    "104,00€",
    "No",
    1,
    "649338113",
    "CALLE Alfarería 107",
    41010,
    "Sevilla",
    "Sevilla",
  ]
  const sheet = XLSX.utils.aoa_to_sheet([["CRM Aenergetic"], [], headers, row])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, "Hoja1")
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
}

describe("parseContractsFromExcel CRM Aenergetic", () => {
  it("detecta cabecera en fila 3 y omite comisión/puntos", () => {
    const rows = parseContractsFromExcel(crmWorkbookBuffer())
    expect(rows).toHaveLength(1)
    expect(rows[0]?.clientName).toBe("HELIOS 1969 S.L.")
    expect(rows[0]?.nif).toBe("27778991M")
    expect(rows[0]?.tarifa).toBe("TARIFA 24 HORAS")
    expect(rows[0]?.tarifaPeaje).toBe("2.0TD")
    expect(rows[0]?.codigoPostal).toBe("41010")
    expect(rows[0]?.consumoAnual).toBe(0)
  })

  it("asigna CUPS de Berni al comercial correcto", () => {
    const assigned = resolveImportComercialForCups(
      "ES0031105723137003LW",
      [{
        id: "cf1a0302-39e2-4ccd-a043-10cc0b386dd4",
        fullName: "Berni",
        role: "comercial",
        email: "",
        commissionPercentage: 50,
        managerId: null,
        status: "activo",
        permissions: { contractsView: true, comparatorAccess: true, quickSettlement: true },
      }],
      { id: "x", fullName: "Fallback" }
    )
    expect(assigned.comercialId).toBe("cf1a0302-39e2-4ccd-a043-10cc0b386dd4")
  })
})
