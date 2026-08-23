import { normalizeContractEstado, type ContractEstado } from "./contract-estado"

export type ContractActionTier = "urgent" | "attention" | "pending"

const ACTION_ESTADOS: Record<ContractActionTier, ContractEstado[]> = {
  urgent: ["INCIDENCIA ADMINISTRATIVA", "FIRMA CADUCADA"],
  attention: ["PTE DE FIRMA", "TRAMITANDO"],
  pending: ["PTE DE TRAMITACIÓN", "Borrador"],
}

export function getContractActionTier(estado: string): ContractActionTier | null {
  const normalized = normalizeContractEstado(estado)
  for (const tier of ["urgent", "attention", "pending"] as const) {
    if (ACTION_ESTADOS[tier].includes(normalized)) return tier
  }
  return null
}

export function contractRequiresUserAction(estado: string): boolean {
  return getContractActionTier(estado) !== null
}

/** Resalta la fila con el color del estado cuando requiere acción del usuario. */
export function getContractActionRowClass(estado: string): string {
  const normalized = normalizeContractEstado(estado)
  switch (normalized) {
    case "INCIDENCIA ADMINISTRATIVA":
      return "bg-violet-500/10 dark:bg-violet-500/12 border-l-4 border-l-violet-500 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.12)]"
    case "FIRMA CADUCADA":
      return "bg-orange-500/12 dark:bg-orange-500/14 border-l-4 border-l-orange-500 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.15)]"
    case "PTE DE FIRMA":
      return "bg-amber-500/12 dark:bg-amber-500/14 border-l-4 border-l-amber-500 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.15)]"
    case "TRAMITANDO":
      return "bg-sky-500/10 dark:bg-sky-500/12 border-l-4 border-l-sky-500 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.12)]"
    case "PTE DE TRAMITACIÓN":
      return "bg-slate-400/10 dark:bg-slate-500/12 border-l-4 border-l-slate-400 dark:border-l-slate-500"
    case "Borrador":
      return "bg-slate-400/14 dark:bg-slate-600/20 border-l-4 border-l-slate-400 dark:border-l-slate-500"
    default:
      return ""
  }
}

export function countContractsByActionTier(
  contracts: { estado: string }[]
): Record<ContractActionTier, number> {
  const counts: Record<ContractActionTier, number> = {
    urgent: 0,
    attention: 0,
    pending: 0,
  }
  for (const contract of contracts) {
    const tier = getContractActionTier(contract.estado)
    if (tier) counts[tier] += 1
  }
  return counts
}
