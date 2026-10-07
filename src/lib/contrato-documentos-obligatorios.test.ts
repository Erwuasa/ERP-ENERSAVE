import { describe, expect, it } from "vitest"
import {
  filterDocumentosObligatoriosByTipoCliente,
  getDocumentosObligatoriosForMarco,
} from "./contrato-documentos"

describe("documentos obligatorios por tipo cliente", () => {
  it("autónomo: solo DNI obligatorio, no CIF", () => {
    const ids = getDocumentosObligatoriosForMarco(null, "autonomo")
    expect(ids).toEqual(["dni_nie_titular"])
  })

  it("PYME: solo CIF obligatorio, no DNI", () => {
    const ids = getDocumentosObligatoriosForMarco(null, "pyme")
    expect(ids).toEqual(["cif_empresa"])
  })

  it("filtra lista del marco que incluye ambos", () => {
    const filtered = filterDocumentosObligatoriosByTipoCliente(
      ["dni_nie_titular", "cif_empresa", "factura_luz"],
      "pyme"
    )
    expect(filtered).toEqual(["cif_empresa", "factura_luz"])
  })
})
