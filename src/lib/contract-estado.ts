export const CONTRACT_ESTADOS = [
  "Pendiente de info.",
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
export const CONTRACT_ESTADO_INCOMPLETO: ContractEstado = "Pendiente de info."

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
    case "Pendiente de info.":
      return "bg-slate-400/20 text-slate-600 dark:text-slate-300 border border-slate-400/30"
    case "PTE DE TRAMITACIÓN":
      return "bg-[#f4f4f5] text-slate-700 dark:bg-slate-700/80 dark:text-slate-200 border border-slate-300/60 dark:border-slate-500/40"
    case "PTE DE FIRMA":
      return "bg-amber-100/90 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200 border border-amber-300/50 dark:border-amber-500/25"
    case "FIRMA CADUCADA":
      return "bg-orange-100/90 text-orange-800 dark:bg-orange-500/15 dark:text-orange-200 border border-orange-300/50 dark:border-orange-500/25"
    case "TRAMITANDO":
      return "bg-sky-100/90 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200 border border-sky-300/50 dark:border-sky-500/25"
    case "ACTIVADO":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25"
    case "INCIDENCIA ADMINISTRATIVA":
      return "bg-violet-100/90 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200 border border-violet-300/50 dark:border-violet-500/25"
    case "Dado de Baja":
      return "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/25"
    default:
      return "bg-slate-500/15 text-slate-500 border border-slate-500/20"
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

export function isContractTerminal(estado: string): boolean {
  const e = normalizeContractEstado(estado)
  return e === "Dado de Baja" || e === "FIRMA CADUCADA"
}
