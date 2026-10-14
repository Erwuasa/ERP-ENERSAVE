import type { NewContractFormState } from "@/lib/contract-registration"
import { enertechSegmentoFromTipoCliente, type EnertechSegmento } from "@/lib/enertech/contract-alta"

export const DOCUMENTACION_MENSAJE = {
  cargando: "Consultando documentación de Enertech…",
  sinDatos: "Enertech no indica documentos para este caso.",
  comercializadora: "Enertech no reconoce esta comercializadora.",
  segmento: "Falta el tipo de cliente para consultar la documentación.",
  fallo: "No se ha podido consultar la documentación de Enertech.",
} as const

/** Clave de `GET /documentacion` → hueco de subida del ERP. */
const CLAVE_A_SLOT: Record<string, string> = {
  dni: "dni_firmante",
  cif: "cif_empresa",
  factura: "factura_luz",
  alta_nueva_boletin: "certificado_instalacion",
  cambio_tit_justo_titulo: "justo_titulo",
  cambio_tit_anexo_cambio: "cambio_titularidad",
  mod_potencia_anexo_cambio: "adenda_cambio_datos",
  certificado_iban: "certificado_iban",
  anexo_visita_comercial: "anexo_visita_comercial",
  autoconsumo_boletin_placas: "autoconsumo_boletin_placas",
  autoconsumo_anexo_autoconsumo: "autoconsumo_anexo_autoconsumo",
  recibo_autonomo: "recibo_autonomo",
  carta_poder: "carta_poder",
  dni_firmante: "dni_firmante",
  acta_junta: "acta_junta",
  carta_certificacion: "carta_certificacion",
  escrituras: "escrituras",
}

export type DocumentacionFase = "listo" | "sin_datos" | "comercializadora" | "segmento" | "error"

export interface DocumentacionResultado {
  fase: DocumentacionFase
  obligatorios: string[]
}

export interface DocumentacionConsulta {
  comercializadora: string
  segmento: EnertechSegmento
  producto: "luz" | "gas"
  altaNueva: boolean
  cambioTitular: boolean
  cambioPotencia: boolean
  autoconsumo: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function slotIdForDocumentoClave(clave: string): string | null {
  const key = clave.trim().toLowerCase()
  if (!key) return null
  if (CLAVE_A_SLOT[key]) return CLAVE_A_SLOT[key]
  return /^[a-z0-9_]+$/.test(key) ? key : null
}

export function documentacionConsultaFromForm(
  form: Pick<NewContractFormState, "compania" | "tipoCliente" | "tipo" | "tipoOperacion" | "esCambioTitular">
): DocumentacionConsulta | null {
  const comercializadora = form.compania.trim()
  if (!comercializadora) return null
  return {
    comercializadora,
    segmento: enertechSegmentoFromTipoCliente(form.tipoCliente),
    producto: form.tipo === "gas" ? "gas" : "luz",
    altaNueva: form.tipoOperacion === "alta_nueva",
    cambioTitular: form.esCambioTitular === true,
    cambioPotencia: false,
    autoconsumo: false,
  }
}

export function documentacionSearchParams(consulta: DocumentacionConsulta): Record<string, string> {
  return {
    comercializadora: consulta.comercializadora,
    segmento: consulta.segmento,
    producto: consulta.producto,
    alta_nueva: consulta.altaNueva ? "1" : "0",
    cambio_titular: consulta.cambioTitular ? "1" : "0",
    cambio_potencia: consulta.cambioPotencia ? "1" : "0",
    autoconsumo: consulta.autoconsumo ? "1" : "0",
  }
}

function readDocumentos(body: Record<string, unknown>): { clave: string; obligatorio: boolean }[] {
  const list = body.documentos
  if (!Array.isArray(list)) return []
  const docs: { clave: string; obligatorio: boolean }[] = []
  for (const item of list) {
    if (typeof item === "string") {
      docs.push({ clave: item, obligatorio: true })
      continue
    }
    if (!isRecord(item)) continue
    const clave = asText(item.clave) || asText(item.nombre)
    if (!clave) continue
    docs.push({ clave, obligatorio: item.obligatorio !== false })
  }
  return docs
}

function obligatoriosDe(docs: { clave: string; obligatorio: boolean }[]): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const doc of docs) {
    if (!doc.obligatorio) continue
    const slot = slotIdForDocumentoClave(doc.clave)
    if (!slot || seen.has(slot)) continue
    seen.add(slot)
    ids.push(slot)
  }
  return ids
}

function resultado(fase: DocumentacionFase, obligatorios: string[] = []): DocumentacionResultado {
  return { fase, obligatorios }
}

/**
 * Interpreta la respuesta de `GET /documentacion`.
 * Un 404 sin `COMPANY_NOT_FOUND` es la función sin desplegar, no una comercializadora desconocida.
 */
export function parseDocumentacionResponse(httpStatus: number, body: unknown): DocumentacionResultado {
  const payload = isRecord(body) ? body : {}
  const code = asText(payload.code)

  if (httpStatus === 404) {
    return code === "COMPANY_NOT_FOUND" ? resultado("comercializadora") : resultado("error")
  }

  if (httpStatus === 400) {
    if (code && code !== "MISSING_SEGMENT" && code !== "INVALID_SEGMENT") return resultado("error")
    return resultado("segmento")
  }

  if (httpStatus >= 200 && httpStatus < 300) {
    if (payload.sin_datos === true) return resultado("sin_datos")
    const obligatorios = obligatoriosDe(readDocumentos(payload))
    if (obligatorios.length === 0) return resultado("sin_datos")
    return resultado("listo", obligatorios)
  }

  return resultado("error")
}

export function mensajeDocumentacion(
  fase: "idle" | "cargando" | DocumentacionFase
): string | null {
  if (fase === "cargando") return DOCUMENTACION_MENSAJE.cargando
  if (fase === "sin_datos") return DOCUMENTACION_MENSAJE.sinDatos
  if (fase === "comercializadora") return DOCUMENTACION_MENSAJE.comercializadora
  if (fase === "segmento") return DOCUMENTACION_MENSAJE.segmento
  if (fase === "error") return DOCUMENTACION_MENSAJE.fallo
  return null
}
