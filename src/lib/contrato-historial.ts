import type { Contract } from "@/types/contract"
import { formatContractEstadoLabel } from "@/lib/contract-estado"

export type ContratoHistorialEventoTipo =
  | "nota_interna"
  | "cambio_estado"
  | "documento_adjuntado"
  | "incidencia"
  | "contrato_creado"

export interface ContratoHistorialEvento {
  id: string
  tipo: ContratoHistorialEventoTipo
  createdAt: string
  autorNombre: string
  titulo: string
  detalle?: string
  estadoAnterior?: string
  estadoNuevo?: string
}

export function getContractLastModifiedAt(contract: Contract): string {
  return contract.updatedAt ?? contract.createdAt
}

export function compareContractsByLastModified(a: Contract, b: Contract): number {
  const aTime = new Date(getContractLastModifiedAt(a)).getTime()
  const bTime = new Date(getContractLastModifiedAt(b)).getTime()
  if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0
  if (Number.isNaN(aTime)) return 1
  if (Number.isNaN(bTime)) return -1
  return bTime - aTime
}

export function formatHistorialDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatHistorialEstadoLabel(estado?: string): string {
  if (!estado?.trim()) return "—"
  return formatContractEstadoLabel(estado)
}

export function getHistorialEventoIconClass(tipo: ContratoHistorialEventoTipo): string {
  switch (tipo) {
    case "cambio_estado":
      return "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25"
    case "nota_interna":
      return "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/25"
    case "documento_adjuntado":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25"
    case "incidencia":
      return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25"
    case "contrato_creado":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
    default:
      return "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/25"
  }
}
