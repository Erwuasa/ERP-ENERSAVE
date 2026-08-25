import type { Contract } from "@/types/contract"
import type { Profile } from "@/types/profile"
import type { Settlement } from "@/types/settlement"
import {
  aplicaRenovacionAnual,
  computeRenewalSchedule,
} from "@/lib/contract-segment-rules"

export function computeActivationCommission(
  tipo: Contract["tipo"],
  consumoKwh: number,
  potenciaKw: number
): number {
  const kwhRate = tipo === "luz" ? 0.015 : 0.012
  const kwRate = tipo === "luz" ? 5.5 : 4.0
  return consumoKwh * kwhRate + potenciaKw * kwRate
}

export interface ActivationSplitPreview {
  totalCom: number
  comercialShare: number
  jefeShare: number
  superadminShare: number
  managerProfile: Profile | null
}

export function computeActivationSplitPreview(
  contract: Contract,
  consumoKwh: number,
  potenciaKw: number,
  profiles: Profile[]
): ActivationSplitPreview {
  const totalCom = computeActivationCommission(contract.tipo, consumoKwh, potenciaKw)
  let comercialShare = Math.round(totalCom * 0.5 * 100) / 100
  let jefeShare = Math.round(totalCom * 0.2 * 100) / 100
  let superadminShare = Math.round(totalCom * 0.3 * 100) / 100

  const comercialProfile = profiles.find((p) => p.id === contract.comercialId)
  const managerId = comercialProfile?.managerId ?? null
  const managerProfile = managerId ? profiles.find((p) => p.id === managerId) ?? null : null

  if (!managerId) {
    superadminShare += jefeShare
    jefeShare = 0
  }

  return {
    totalCom: Math.round(totalCom * 100) / 100,
    comercialShare,
    jefeShare,
    superadminShare: Math.round(superadminShare * 100) / 100,
    managerProfile,
  }
}

export interface ActivationDistributionResult {
  updatedContract: Contract
  settlements: Settlement[]
  comercialShare: number
  jefeShare: number
}

export function buildActivationDistribution(
  contract: Contract,
  consumoKwh: number,
  potenciaKw: number,
  profiles: Profile[],
  today: string
): ActivationDistributionResult {
  const preview = computeActivationSplitPreview(contract, consumoKwh, potenciaKw, profiles)
  const newRecords: Settlement[] = []

  newRecords.push({
    id: `liq-auto-c-${Math.floor(1000 + Math.random() * 9000).toString()}`,
    comercialId: contract.comercialId,
    comercialName: contract.comercialName,
    montoInterno: preview.totalCom,
    montoExterno: preview.comercialShare,
    estado: "pendiente",
    tipo: contract.tipo,
    descripcion: `Comisión Directa (50%) - Contrato Activo: ${contract.clientName} (CUPS: ${contract.cups})`,
    createdAt: today,
  })

  if (preview.managerProfile && preview.jefeShare > 0) {
    newRecords.push({
      id: `liq-auto-j-${Math.floor(1000 + Math.random() * 9000).toString()}`,
      comercialId: preview.managerProfile.id,
      comercialName: preview.managerProfile.fullName,
      montoInterno: preview.totalCom,
      montoExterno: preview.jefeShare,
      estado: "pendiente",
      tipo: contract.tipo,
      descripcion: `Comisión de Dirección Override (20% de ${contract.comercialName}) - Contrato Activo: ${contract.clientName}`,
      createdAt: today,
    })
  }

  const renewalSchedule = aplicaRenovacionAnual(contract)
    ? computeRenewalSchedule(today)
    : { estadoRenovacion: "No aplica" as const }

  const updatedContract: Contract = {
    ...contract,
    estado: "ACTIVADO",
    createdAt: today,
    consumoAnual: consumoKwh,
    montoInterno: preview.totalCom,
    montoExterno: preview.comercialShare + preview.jefeShare,
    fechaFin: renewalSchedule.fechaRenovacion,
    fechaRenovacion: renewalSchedule.fechaRenovacion,
    diasRenovacion: renewalSchedule.diasRenovacion,
    estadoRenovacion: renewalSchedule.estadoRenovacion,
  }

  return {
    updatedContract,
    settlements: newRecords,
    comercialShare: preview.comercialShare,
    jefeShare: preview.jefeShare,
  }
}
