export const CONTRACT_ESTADOS = [
  "Temporal",
  "Pendiente de firma",
  "Firma Caducada",
  "KO",
  "Incidencia",
  "Activado",
  "Dado de Baja",
] as const

export type ContractEstado = (typeof CONTRACT_ESTADOS)[number]

const LEGACY_ESTADO_MAP: Record<string, ContractEstado> = {
  activo: "Activado",
  pendiente: "Pendiente de firma",
  rechazado: "KO",
  baja: "Dado de Baja",
}

export function normalizeContractEstado(value: string): ContractEstado {
  if (CONTRACT_ESTADOS.includes(value as ContractEstado)) {
    return value as ContractEstado
  }
  return LEGACY_ESTADO_MAP[value.toLowerCase()] ?? "Temporal"
}

export function getContractEstadoBadgeClass(estado: string): string {
  switch (normalizeContractEstado(estado)) {
    case "Activado":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
    case "Pendiente de firma":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
    case "Temporal":
      return "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20"
    case "Incidencia":
      return "bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20"
    case "Firma Caducada":
      return "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/20"
    case "KO":
      return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
    case "Dado de Baja":
      return "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/25"
    default:
      return "bg-slate-500/15 text-slate-500 border border-slate-500/20"
  }
}

export function canActivateContract(estado: string): boolean {
  const e = normalizeContractEstado(estado)
  return e === "Pendiente de firma" || e === "Temporal" || e === "Incidencia"
}

export function canBajaContract(estado: string): boolean {
  return normalizeContractEstado(estado) === "Activado"
}

export function isContractActivado(estado: string): boolean {
  return normalizeContractEstado(estado) === "Activado"
}

export function isContractTerminal(estado: string): boolean {
  const e = normalizeContractEstado(estado)
  return e === "Dado de Baja" || e === "KO" || e === "Firma Caducada"
}
