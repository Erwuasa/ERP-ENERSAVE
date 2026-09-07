import type { Contract } from "@/types/contract"
import type { Settlement } from "@/types/settlement"
import { normalizeTipoClienteSegment } from "@/lib/contract-segment-rules"
import {
  calcularPorcentajeRetrocomision,
  getPeajeTramo,
} from "@/lib/retro-period"
import type { RetrocomisionSchedule } from "@/lib/supabase/retrocomision-schedules"
import {
  findActivationSettlement,
  findContractCommissionSettlement,
} from "@/lib/contract-settlements"

function parseIsoDateOnly(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function resolveContractActivationDateIso(contract: Contract): string {
  return (contract.estadoEfectivoDesde ?? contract.createdAt ?? "").trim().slice(0, 10)
}

export function getMesesTranscurridosEntreActivacionYBaja(
  activationDateIso: string,
  bajaDateIso: string
): number {
  const activation = parseIsoDateOnly(activationDateIso)
  const baja = parseIsoDateOnly(bajaDateIso)
  if (baja.getTime() < activation.getTime()) return -1

  const months =
    (baja.getFullYear() - activation.getFullYear()) * 12 +
    (baja.getMonth() - activation.getMonth())

  return Math.max(0, months)
}

export function resolveOriginalComisionComercial(
  contract: Contract,
  settlements: Settlement[] = []
): number {
  const activationSettlement =
    findActivationSettlement(settlements, contract.id) ??
    findContractCommissionSettlement(settlements, contract.id, contract.comercialId)

  if (activationSettlement && activationSettlement.montoExterno > 0) {
    return activationSettlement.montoExterno
  }

  return contract.montoExterno ?? 0
}

export interface RetrocomisionClawbackComputation {
  mesesTranscurridos: number
  porcentajeAplicado: number
  valorFijoEur?: number
  clawbackAmount: number
  internalClawback: number
  isInvalidDate: boolean
  hasClawback: boolean
  estimado?: boolean
}

export function computeRetrocomisionClawback(
  contract: Contract,
  bajaDate: string,
  schedules: RetrocomisionSchedule[],
  settlements: Settlement[] = []
): RetrocomisionClawbackComputation {
  const activationDate = resolveContractActivationDateIso(contract)
  const mesesTranscurridos = getMesesTranscurridosEntreActivacionYBaja(
    activationDate,
    bajaDate
  )

  if (mesesTranscurridos < 0) {
    return {
      mesesTranscurridos: 0,
      porcentajeAplicado: 0,
      clawbackAmount: 0,
      internalClawback: 0,
      isInvalidDate: true,
      hasClawback: false,
    }
  }

  const segmento = normalizeTipoClienteSegment({
    tipoCliente: contract.tipoCliente,
    compania: contract.compania,
    clientName: contract.clientName,
    nif: contract.nif,
  })
  const segmentoRetro = segmento === "pyme" ? "pyme" : "residencial"
  const peaje = getPeajeTramo(contract.atr ?? contract.tarifa ?? "")

  const retro = calcularPorcentajeRetrocomision(
    contract.compania,
    segmentoRetro,
    peaje,
    mesesTranscurridos,
    schedules
  )

  const porcentajeAplicado = retro.porcentaje
  const valorFijoEur = retro.valorFijoEur
  const hasClawback = porcentajeAplicado > 0 || (valorFijoEur ?? 0) > 0

  if (!hasClawback) {
    return {
      mesesTranscurridos,
      porcentajeAplicado: 0,
      valorFijoEur,
      clawbackAmount: 0,
      internalClawback: 0,
      isInvalidDate: false,
      hasClawback: false,
      estimado: retro.estimado,
    }
  }

  const originalComercial = resolveOriginalComisionComercial(contract, settlements)
  const originalInterno = contract.montoInterno ?? originalComercial

  let clawbackAmount = 0
  let internalClawback = 0

  if ((valorFijoEur ?? 0) > 0) {
    clawbackAmount = valorFijoEur ?? 0
    internalClawback = 0
  } else {
    clawbackAmount = Math.round(originalComercial * (porcentajeAplicado / 100) * 100) / 100
    internalClawback =
      Math.round(originalInterno * (porcentajeAplicado / 100) * 100) / 100
  }

  return {
    mesesTranscurridos,
    porcentajeAplicado,
    valorFijoEur,
    clawbackAmount,
    internalClawback,
    isInvalidDate: false,
    hasClawback: true,
    estimado: retro.estimado,
  }
}

export function buildRetrocomisionClawbackDescription(
  contract: Contract,
  clawback: RetrocomisionClawbackComputation
): string {
  const cups = contract.cups || "—"
  const meses = clawback.mesesTranscurridos

  if ((clawback.valorFijoEur ?? 0) > 0) {
    return `Retrocomisión — baja contrato ${cups} a los ${meses} meses (${clawback.valorFijoEur!.toFixed(2)} € fijo aplicado)`
  }

  return `Retrocomisión — baja contrato ${cups} a los ${meses} meses (${clawback.porcentajeAplicado.toFixed(0)}% aplicado)`
}

/** @deprecated Usar computeRetrocomisionClawback */
export function computeClawback(
  contract: Contract,
  bajaDate: string,
  schedules: RetrocomisionSchedule[] = [],
  settlements: Settlement[] = []
) {
  const result = computeRetrocomisionClawback(contract, bajaDate, schedules, settlements)
  return {
    diffMonths: result.mesesTranscurridos,
    limitMonths: 0,
    clawbackPercent: result.porcentajeAplicado / 100,
    clawbackAmount: result.clawbackAmount,
    internalClawback: result.internalClawback,
    isSecure: !result.hasClawback,
    isInvalidDate: result.isInvalidDate,
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
  clawback: Pick<RetrocomisionClawbackComputation, "clawbackAmount" | "porcentajeAplicado">
): ClawbackPendingContract {
  return {
    id: `pcon-neg-${Date.now()}`,
    code: `CLAW-${contract.id.toUpperCase()}`,
    cups: contract.cups,
    dateFirm: contract.createdAt,
    dateAct: bajaDate,
    direction: "Penalización de baja por retrocomisión",
    agentId: contract.comercialId,
    agentName: contract.comercialName,
    brand: contract.compania,
    tariff: `${clawback.porcentajeAplicado.toFixed(0)}% Penalización`,
    price: -clawback.clawbackAmount,
    checked: true,
    clientName: `Retrocomisión: ${contract.clientName}`,
    tipo: contract.tipo,
  }
}
