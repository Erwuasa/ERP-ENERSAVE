import type { Contract } from "@/types/contract"

export function getClawbackLimitMonths(compania: string): number {
  const brand = compania.toLowerCase()
  if (brand.includes("naturgy") || brand.includes("repsol")) return 4
  if (brand.includes("endesa")) return 2
  if (brand.includes("gana") || brand.includes("iberdrola") || brand.includes("niba")) {
    return 12
  }
  return 6
}

export interface ClawbackComputation {
  diffMonths: number
  limitMonths: number
  clawbackPercent: number
  clawbackAmount: number
  internalClawback: number
  isSecure: boolean
  isInvalidDate: boolean
}

export function computeClawback(contract: Contract, bajaDate: string): ClawbackComputation {
  const actDate = new Date(contract.createdAt)
  const cancelDate = new Date(bajaDate)
  const diffTime = cancelDate.getTime() - actDate.getTime()

  if (diffTime < 0) {
    return {
      diffMonths: 0,
      limitMonths: getClawbackLimitMonths(contract.compania),
      clawbackPercent: 0,
      clawbackAmount: 0,
      internalClawback: 0,
      isSecure: false,
      isInvalidDate: true,
    }
  }

  const limitMonths = getClawbackLimitMonths(contract.compania)
  const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.4)
  const isSecure = diffMonths >= limitMonths

  let clawbackPercent = 0
  let clawbackAmount = 0

  if (!isSecure) {
    clawbackPercent = 1 - diffMonths / limitMonths
    clawbackAmount = contract.montoExterno * clawbackPercent
  }

  const clawbackAmountRounded = Math.round(clawbackAmount * 100) / 100
  const internalClawbackRounded =
    Math.round(contract.montoInterno * clawbackPercent * 100) / 100

  return {
    diffMonths,
    limitMonths,
    clawbackPercent,
    clawbackAmount: clawbackAmountRounded,
    internalClawback: internalClawbackRounded,
    isSecure,
    isInvalidDate: false,
  }
}

export interface ClawbackPendingContract {
  id: string
  code: string
  cups: string
  dateFirm: string
  dateAct: string
  direction: string
  agentId: string
  agentName: string
  brand: string
  tariff: string
  price: number
  checked: boolean
  clientName: string
  tipo: Contract["tipo"]
}

export function buildClawbackPendingContract(
  contract: Contract,
  bajaDate: string,
  clawback: ClawbackComputation
): ClawbackPendingContract {
  return {
    id: `pcon-neg-${Date.now()}`,
    code: `CLAW-${contract.id.toUpperCase()}`,
    cups: contract.cups,
    dateFirm: contract.createdAt,
    dateAct: bajaDate,
    direction: `Penalización de baja de contrato antes de ${clawback.limitMonths} meses`,
    agentId: contract.comercialId,
    agentName: contract.comercialName,
    brand: contract.compania,
    tariff: `${(clawback.clawbackPercent * 100).toFixed(0)}% Penalización`,
    price: -clawback.clawbackAmount,
    checked: true,
    clientName: `Retrocomisión: ${contract.clientName}`,
    tipo: contract.tipo,
  }
}
