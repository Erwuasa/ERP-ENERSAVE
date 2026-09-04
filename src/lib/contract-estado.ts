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

export function formatContractEstadoLabel(estado: string): string {
  switch (normalizeContractEstado(estado)) {
    case "Borrador":
      return "Borrador"
    case "PTE DE TRAMITACIÓN":
      return "Pte. tramit."
    case "PTE DE FIRMA":
      return "Pte. firma"
    case "FIRMA CADUCADA":
      return "Caducada"
    case "TRAMITANDO":
      return "Tramitando"
    case "ACTIVADO":
      return "Activado"
    case "INCIDENCIA ADMINISTRATIVA":
      return "Incidencia"
    case "Dado de Baja":
      return "Baja"
    default:
      return estado
  }
}

export function getContractEstadoDotClass(estado: string): string {
  switch (normalizeContractEstado(estado)) {
    case "Borrador":
      return "bg-slate-400"
    case "PTE DE TRAMITACIÓN":
      return "bg-slate-500"
    case "PTE DE FIRMA":
      return "bg-amber-500"
    case "FIRMA CADUCADA":
      return "bg-orange-500"
    case "TRAMITANDO":
      return "bg-sky-500"
    case "ACTIVADO":
      return "bg-emerald-500"
    case "INCIDENCIA ADMINISTRATIVA":
      return "bg-violet-500"
    case "Dado de Baja":
      return "bg-slate-400"
    default:
      return "bg-slate-400"
  }
}

export function getContractEstadoBadgeClass(estado: string): string {
  switch (normalizeContractEstado(estado)) {
    case "Borrador":
      return "bg-slate-400/15 text-slate-600 dark:text-slate-300 ring-slate-400/25"
    case "PTE DE TRAMITACIÓN":
      return "bg-slate-500/10 text-slate-600 dark:text-slate-200 ring-slate-400/25"
    case "PTE DE FIRMA":
      return "bg-amber-500/12 text-amber-800 dark:text-amber-300 ring-amber-500/25"
    case "FIRMA CADUCADA":
      return "bg-orange-500/12 text-orange-800 dark:text-orange-300 ring-orange-500/25"
    case "TRAMITANDO":
      return "bg-sky-500/12 text-sky-800 dark:text-sky-300 ring-sky-500/25"
    case "ACTIVADO":
      return "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25"
    case "INCIDENCIA ADMINISTRATIVA":
      return "bg-violet-500/12 text-violet-800 dark:text-violet-300 ring-violet-500/25"
    case "Dado de Baja":
      return "bg-slate-500/10 text-slate-500 dark:text-slate-400 ring-slate-500/20"
    default:
      return "bg-slate-500/10 text-slate-500 ring-slate-500/20"
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
