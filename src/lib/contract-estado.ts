export const CONTRACT_ESTADOS = [
  "Borrador",
  "PTE DE TRAMITACIÓN",
  "PTE DE FIRMA",
  "FIRMA CADUCADA",
  "TRAMITANDO",
  "ACTIVADO",
  "INCIDENCIA ADMINISTRATIVA",
  "Dado de Baja",
] as const

export type ContractEstado = (typeof CONTRACT_ESTADOS)[number]

export const CONTRACT_ESTADO_INICIAL: ContractEstado = "PTE DE TRAMITACIÓN"
export const CONTRACT_ESTADO_BORRADOR: ContractEstado = "Borrador"
export const CONTRACT_ESTADO_INCOMPLETO: ContractEstado = CONTRACT_ESTADO_BORRADOR

const LEGACY_ESTADO_MAP: Record<string, ContractEstado> = {
  activo: "ACTIVADO",
  pendiente: "PTE DE FIRMA",
  rechazado: "INCIDENCIA ADMINISTRATIVA",
  baja: "Dado de Baja",
  temporal: "PTE DE TRAMITACIÓN",
  "pendiente de firma": "PTE DE FIRMA",
  "firma caducada": "FIRMA CADUCADA",
  ko: "INCIDENCIA ADMINISTRATIVA",
  incidencia: "INCIDENCIA ADMINISTRATIVA",
  activado: "ACTIVADO",
  borrador: "Borrador",
  "pendiente de info.": "Borrador",
  "pendiente de información": "Borrador",
}

export function normalizeContractEstado(value: string): ContractEstado {
  if (CONTRACT_ESTADOS.includes(value as ContractEstado)) {
    return value as ContractEstado
  }
  const key = value.toLowerCase().trim()
  return LEGACY_ESTADO_MAP[key] ?? CONTRACT_ESTADO_INICIAL
}

export function getContractEstadoBadgeClass(estado: string): string {
  switch (normalizeContractEstado(estado)) {
    case "Borrador":
      return "bg-slate-200/80 text-slate-700 dark:bg-slate-600/30 dark:text-slate-200 border border-slate-300/70 dark:border-slate-500/40"
    case "PTE DE TRAMITACIÓN":
      return "bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200 border border-slate-300/60 dark:border-slate-500/35"
    case "PTE DE FIRMA":
      return "bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-100 border border-amber-300/70 dark:border-amber-400/30"
    case "FIRMA CADUCADA":
      return "bg-orange-100 text-orange-900 dark:bg-orange-400/20 dark:text-orange-100 border border-orange-300/70 dark:border-orange-400/30"
    case "TRAMITANDO":
      return "bg-sky-100 text-sky-900 dark:bg-sky-400/20 dark:text-sky-100 border border-sky-300/70 dark:border-sky-400/30"
    case "ACTIVADO":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200 border border-emerald-400/50 dark:border-emerald-500/30"
    case "INCIDENCIA ADMINISTRATIVA":
      return "bg-violet-100 text-violet-900 dark:bg-violet-500/20 dark:text-violet-100 border border-violet-300/70 dark:border-violet-500/30"
    case "Dado de Baja":
      return "bg-slate-200/70 text-slate-600 dark:bg-slate-600/25 dark:text-slate-300 border border-slate-400/40 dark:border-slate-500/30"
    default:
      return "bg-slate-200/70 text-slate-600 border border-slate-400/30"
  }
}

/** Etiqueta compacta para badges en tabla (evita solapamiento). */
export function formatContractEstadoTableLabel(estado: string): string {
  switch (normalizeContractEstado(estado)) {
    case "PTE DE TRAMITACIÓN":
      return "PTE TRAM."
    case "PTE DE FIRMA":
      return "PTE FIRMA"
    case "INCIDENCIA ADMINISTRATIVA":
      return "INCIDENCIA"
    case "FIRMA CADUCADA":
      return "FIRMA CAD."
    case "Dado de Baja":
      return "BAJA"
    default:
      return normalizeContractEstado(estado)
  }
}

export function canActivateContract(estado: string): boolean {
  const e = normalizeContractEstado(estado)
  return e === "PTE DE FIRMA" || e === "PTE DE TRAMITACIÓN" || e === "INCIDENCIA ADMINISTRATIVA"
}

export function canBajaContract(estado: string): boolean {
  return normalizeContractEstado(estado) === "ACTIVADO"
}

export function isContractActivado(estado: string): boolean {
  return normalizeContractEstado(estado) === "ACTIVADO"
}

export function isContractBorrador(estado: string): boolean {
  return normalizeContractEstado(estado) === CONTRACT_ESTADO_BORRADOR
}

export function isContractTerminal(estado: string): boolean {
  const e = normalizeContractEstado(estado)
  return e === "Dado de Baja" || e === "FIRMA CADUCADA"
}
