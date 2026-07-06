import type { Prospecto } from "./types"

const CANAL_ORIGEN_LABELS: Record<string, string> = {
  import_contrato_erp: "Importado desde contrato ERP",
  import_cliente_crm: "Importado desde cliente CRM",
}

const IMPORT_CANAL_KEYS = new Set(Object.keys(CANAL_ORIGEN_LABELS))

function readEtiquetasArray(metadata?: Record<string, unknown>): string[] {
  const raw = metadata?.etiquetas
  if (!Array.isArray(raw)) return []
  return raw
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter(Boolean)
}

/** Etiquetas editables del comercial (+ texto libre legacy en canal_origen). */
export function getProspectoEtiquetas(prospecto: Prospecto): string[] {
  const meta = prospecto.metadata ?? {}
  const tags = [...readEtiquetasArray(meta)]

  const referencia = meta.referencia
  if (typeof referencia === "string" && referencia.trim()) {
    const t = referencia.trim()
    if (!tags.includes(t)) tags.push(t)
  }

  const canal = meta.canal_origen
  if (typeof canal === "string" && canal.trim()) {
    if (IMPORT_CANAL_KEYS.has(canal)) {
      const mapped = CANAL_ORIGEN_LABELS[canal]
      if (mapped && !tags.includes(mapped)) tags.push(mapped)
    } else {
      const t = canal.trim()
      if (!tags.includes(t)) tags.push(t)
    }
  }

  return tags
}

/** Texto libre de contacto / referencia (ej. "referido de mi primo"). */
export function getProspectoEtiquetaContacto(prospecto: Prospecto): string | undefined {
  const meta = prospecto.metadata
  if (!meta) return undefined

  const referencia = meta.referencia
  if (typeof referencia === "string" && referencia.trim()) return referencia.trim()

  const canal = meta.canal_origen
  if (typeof canal === "string" && canal.trim()) {
    const mapped = CANAL_ORIGEN_LABELS[canal]
    if (mapped) return mapped
    return canal.trim()
  }

  return undefined
}

export function getProspectoNotasInternas(prospecto: Prospecto): string {
  const value = prospecto.metadata?.notas_internas
  return typeof value === "string" ? value : ""
}

export function mergeProspectoMetadata(
  prospecto: Prospecto,
  patch: Record<string, unknown>
): Record<string, unknown> {
  return { ...(prospecto.metadata ?? {}), ...patch }
}
