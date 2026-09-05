import type { MarcoRetributivoEntry } from "../data/marco-retributivo-catalog"
import type {
  ContratoDocumentoArchivo,
  DocumentosPorTipo,
  NewContractFormState,
} from "./contract-registration"

export const CONTRATO_DOCUMENTO_TIPOS = [
  { id: "dni_nie_titular", label: "DNI o NIE del titular" },
  { id: "cif_empresa", label: "CIF de la empresa" },
  { id: "factura_luz", label: "Factura de la luz actual" },
  { id: "justo_titulo", label: "Justo título" },
  { id: "certificado_instalacion", label: "Certificado de instalación" },
  { id: "adenda_cambio_datos", label: "Adenda de cambio de datos" },
  { id: "cambio_titularidad", label: "Cambio de titularidad" },
  { id: "grabacion_llamada", label: "Grabación de la llamada" },
  { id: "otros", label: "Otros documentos" },
] as const

export type ContratoDocumentoTipoId = (typeof CONTRATO_DOCUMENTO_TIPOS)[number]["id"]

/** IDs históricos del wizard antes de ampliar el catálogo. */
const LEGACY_DOCUMENTO_TIPO_MAP: Record<string, ContratoDocumentoTipoId> = {
  cif_nif: "cif_empresa",
  dni_nie: "dni_nie_titular",
  factura: "factura_luz",
  grabacion_legal: "grabacion_llamada",
}

export function normalizeDocumentoTipoId(tipo: string | undefined): ContratoDocumentoTipoId | null {
  if (!tipo) return null
  if (CONTRATO_DOCUMENTO_TIPOS.some((t) => t.id === tipo)) {
    return tipo as ContratoDocumentoTipoId
  }
  return LEGACY_DOCUMENTO_TIPO_MAP[tipo] ?? null
}

export function getDocumentoTipoLabel(tipo: string | undefined): string {
  const normalized = normalizeDocumentoTipoId(tipo)
  if (!normalized) return tipo ?? "Documento"
  return CONTRATO_DOCUMENTO_TIPOS.find((t) => t.id === normalized)?.label ?? normalized
}

export interface ContratoDocumentoRecord {
  id: string
  name: string
  size: string
  tipo: ContratoDocumentoTipoId | string
  uploadedAt: string
  storagePath?: string
  mimeType?: string
  dataUrl?: string
}

export const DEFAULT_DOCUMENTOS_OBLIGATORIOS: ContratoDocumentoTipoId[] = [
  "cif_empresa",
  "dni_nie_titular",
]

export function getDocumentosObligatoriosForMarco(
  entry: MarcoRetributivoEntry | null | undefined
): ContratoDocumentoTipoId[] {
  const fromMarco = entry?.documentosObligatorios
  if (fromMarco && fromMarco.length > 0) {
    return fromMarco
      .map((id) => normalizeDocumentoTipoId(id))
      .filter((id): id is ContratoDocumentoTipoId => id != null)
  }
  return DEFAULT_DOCUMENTOS_OBLIGATORIOS
}

export function flattenDocumentosPorTipo(
  documentosPorTipo: DocumentosPorTipo
): { name: string; size: string; tipo: string; uploadedAt?: string }[] {
  const flat: { name: string; size: string; tipo: string; uploadedAt?: string }[] = []
  for (const [tipo, files] of Object.entries(documentosPorTipo)) {
    for (const f of files) {
      flat.push({ name: f.name, size: f.size, tipo, uploadedAt: f.uploadedAt })
    }
  }
  return flat
}

export function groupDocumentosByTipo(
  documentos: ContratoDocumentoRecord[] | undefined
): Record<string, ContratoDocumentoRecord[]> {
  const grouped: Record<string, ContratoDocumentoRecord[]> = {}
  for (const doc of documentos ?? []) {
    const tipo = normalizeDocumentoTipoId(doc.tipo) ?? doc.tipo ?? "otros"
    if (!grouped[tipo]) grouped[tipo] = []
    grouped[tipo].push({ ...doc, tipo })
  }
  return grouped
}

export function formatDocumentoSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function countDocumentosPorTipo(documentosPorTipo: DocumentosPorTipo): number {
  return Object.values(documentosPorTipo).reduce((sum, arr) => sum + arr.length, 0)
}

export function getMissingObligatoriosDocumentos(
  documentosPorTipo: DocumentosPorTipo,
  obligatorios: ContratoDocumentoTipoId[]
): { id: ContratoDocumentoTipoId; label: string }[] {
  return obligatorios
    .filter((id) => !(documentosPorTipo[id]?.length ?? 0))
    .map((id) => ({
      id,
      label: CONTRATO_DOCUMENTO_TIPOS.find((t) => t.id === id)?.label ?? id,
    }))
}

export function validateRequiredDocumentos(
  form: NewContractFormState,
  obligatorios: ContratoDocumentoTipoId[]
): { valid: boolean; missingLabels: string[] } {
  const missing = getMissingObligatoriosDocumentos(form.documentosPorTipo, obligatorios)
  return {
    valid: missing.length === 0,
    missingLabels: missing.map((m) => `Documento: ${m.label}`),
  }
}

export async function filesToContratoArchivos(files: File[]): Promise<ContratoDocumentoArchivo[]> {
  const results: ContratoDocumentoArchivo[] = []
  for (const file of files) {
    let dataUrl: string | undefined
    if (file.size < 512_000) {
      dataUrl = await readFileAsDataUrl(file)
    }
    results.push({
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      dataUrl,
      uploadedAt: new Date().toISOString(),
    })
  }
  return results
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
