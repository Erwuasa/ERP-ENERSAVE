import type { MarcoRetributivoEntry } from "../data/marco-retributivo-catalog"
import type {
  ContratoDocumentoArchivo,
  DocumentosPorTipo,
  NewContractFormState,
} from "./contract-registration"

export const CONTRATO_DOCUMENTO_TIPOS = [
  { id: "cif_nif", label: "CIF/NIF (empresa, com. propietarios o a...)" },
  { id: "dni_nie", label: "DNI/NIE (cliente o representante)" },
  { id: "cambio_titularidad", label: "Cambio de titularidad" },
  { id: "grabacion_legal", label: "Grabación legal (audio)" },
  { id: "factura", label: "Factura" },
  { id: "otros", label: "Otros" },
] as const

export type ContratoDocumentoTipoId = (typeof CONTRATO_DOCUMENTO_TIPOS)[number]["id"]

export const DEFAULT_DOCUMENTOS_OBLIGATORIOS: ContratoDocumentoTipoId[] = [
  "cif_nif",
  "dni_nie",
]

export function getDocumentosObligatoriosForMarco(
  entry: MarcoRetributivoEntry | null | undefined
): ContratoDocumentoTipoId[] {
  const fromMarco = entry?.documentosObligatorios
  if (fromMarco && fromMarco.length > 0) {
    return fromMarco.filter((id): id is ContratoDocumentoTipoId =>
      CONTRATO_DOCUMENTO_TIPOS.some((t) => t.id === id)
    )
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
