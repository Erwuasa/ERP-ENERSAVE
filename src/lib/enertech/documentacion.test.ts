import { describe, expect, it } from "vitest"
import { EMPTY_NEW_CONTRACT_FORM } from "@/lib/contract-registration"
import { listWizardDocumentoSlots } from "@/lib/contrato-documentos"
import {
  DOCUMENTACION_MENSAJE,
  documentacionConsultaFromForm,
  documentacionSearchParams,
  mensajeDocumentacion,
  parseDocumentacionResponse,
  slotIdForDocumentoClave,
} from "@/lib/enertech/documentacion"

function doc(clave: string, extra: Record<string, unknown> = {}) {
  return { clave, nombre: clave, obligatorio: true, motivo: "", ...extra }
}

describe("parseDocumentacionResponse", () => {
  it("marca en rojo los huecos que Enertech pide para el caso", () => {
    const parsed = parseDocumentacionResponse(200, {
      sin_datos: false,
      documentos: [
        doc("cif"),
        doc("factura"),
        doc("dni_firmante"),
        doc("escrituras"),
        doc("carta_poder"),
        doc("cambio_tit_justo_titulo", { motivo: "Cambio de titular" }),
      ],
    })
    expect(parsed.fase).toBe("listo")
    expect(parsed.obligatorios).toEqual([
      "cif_empresa",
      "factura_luz",
      "dni_firmante",
      "escrituras",
      "carta_poder",
      "justo_titulo",
    ])
  })

  it("trata sin_datos y la lista vacía como que no hay documentos", () => {
    expect(parseDocumentacionResponse(200, { sin_datos: true, documentos: [] }).fase).toBe("sin_datos")
    expect(parseDocumentacionResponse(200, { documentos: [] }).fase).toBe("sin_datos")
    expect(parseDocumentacionResponse(200, {}).obligatorios).toEqual([])
  })

  it("distingue comercializadora desconocida de la función sin desplegar", () => {
    expect(parseDocumentacionResponse(404, { code: "COMPANY_NOT_FOUND" }).fase).toBe("comercializadora")
    expect(parseDocumentacionResponse(404, { code: "NOT_FOUND" }).fase).toBe("error")
  })

  it("el 400 de segmento no se confunde con otro error", () => {
    expect(parseDocumentacionResponse(400, { code: "MISSING_SEGMENT" }).fase).toBe("segmento")
    expect(parseDocumentacionResponse(400, { code: "INVALID_SEGMENT" }).fase).toBe("segmento")
    expect(parseDocumentacionResponse(400, { code: "MISSING_COMPANY" }).fase).toBe("error")
    expect(parseDocumentacionResponse(502, null).fase).toBe("error")
  })

  it("el boletín de alta nueva reutiliza el certificado de instalación", () => {
    expect(slotIdForDocumentoClave("dni")).toBe("dni_firmante")
    expect(slotIdForDocumentoClave("dni_firmante")).toBe("dni_firmante")
    expect(slotIdForDocumentoClave("alta_nueva_boletin")).toBe("certificado_instalacion")
    expect(slotIdForDocumentoClave("mod_potencia_anexo_cambio")).toBe("adenda_cambio_datos")
  })
})

describe("consulta de documentación", () => {
  it("arma los filtros de compañía, segmento y trámite", () => {
    const consulta = documentacionConsultaFromForm({
      ...EMPTY_NEW_CONTRACT_FORM,
      compania: "Endesa",
      tipoCliente: "comunidad_vecinos",
      tipo: "gas",
      tipoOperacion: "alta_nueva",
      esCambioTitular: true,
    })
    expect(consulta).toMatchObject({
      comercializadora: "Endesa",
      segmento: "ccpp",
      producto: "gas",
      altaNueva: true,
      cambioTitular: true,
      cambioPotencia: false,
      autoconsumo: false,
    })
    expect(documentacionSearchParams(consulta!)).toMatchObject({
      comercializadora: "Endesa",
      segmento: "ccpp",
      producto: "gas",
      alta_nueva: "1",
      cambio_titular: "1",
      cambio_potencia: "0",
      autoconsumo: "0",
    })
  })

  it("no consulta si falta la comercializadora", () => {
    expect(documentacionConsultaFromForm(EMPTY_NEW_CONTRACT_FORM)).toBeNull()
  })
})

describe("mensajes y huecos del alta", () => {
  it("usa el texto de cada estado", () => {
    expect(mensajeDocumentacion("cargando")).toBe(DOCUMENTACION_MENSAJE.cargando)
    expect(mensajeDocumentacion("sin_datos")).toBe("Enertech no indica documentos para este caso.")
    expect(mensajeDocumentacion("comercializadora")).toBe("Enertech no reconoce esta comercializadora.")
    expect(mensajeDocumentacion("segmento")).toBe("Falta el tipo de cliente para consultar la documentación.")
    expect(mensajeDocumentacion("error")).toBe("No se ha podido consultar la documentación de Enertech.")
    expect(mensajeDocumentacion("listo")).toBeNull()
  })

  it("enseña los huecos nuevos aunque Enertech todavía no haya respondido", () => {
    const slots = listWizardDocumentoSlots({
      obligatorios: [],
      documentosPorTipo: {},
    })
    const ids = slots.map((slot) => slot.id)
    expect(ids[0]).toBe("dni_firmante")
    expect(ids).not.toContain("dni_nie_titular")
    expect(ids).toContain("cif_empresa")
    expect(ids).toContain("escrituras")
    expect(ids).toContain("carta_poder")
    expect(ids).toContain("dni_firmante")
    expect(ids).toContain("certificado_iban")
  })
})
