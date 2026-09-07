import type { Settlement } from "../types/settlement"
import type { Contract } from "../types/contract"
import { isRetrocomisionSettlement } from "./liquidaciones-internas"

export const ACTIVATION_SETTLEMENT_EVENTO = "activacion" as const
export const RETROCOMISION_SETTLEMENT_EVENTO = "retrocomision" as const

export interface PendingSettlementInput {
  id: string
  contractId: string
  comercialId: string
  comercialName: string
  montoInterno: number
  montoExterno: number
  tipo: Contract["tipo"]
  clientName: string
  createdAt: string
}

/** Liquidación de comisión (no retro) vinculada a un contrato y comercial concretos. */
export function findContractCommissionSettlement(
  settlements: Settlement[],
  contractId: string,
  comercialId: string
): Settlement | undefined {
  return settlements.find(
    (s) =>
      s.contractId === contractId &&
      s.comercialId === comercialId &&
      !isRetrocomisionSettlement(s)
  )
}

export function findActivationSettlement(
  settlements: Settlement[],
  contractId: string
): Settlement | undefined {
  return settlements.find(
    (settlement) =>
      settlement.contractId === contractId &&
      settlement.tipoEvento === ACTIVATION_SETTLEMENT_EVENTO &&
      !isRetrocomisionSettlement(settlement)
  )
}

export function resolveActivationDate(
  contract: Contract,
  overrideDate?: string
): string {
  const candidate = (overrideDate ?? contract.estadoEfectivoDesde ?? contract.createdAt ?? "")
    .trim()
    .slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return candidate
  return new Date().toISOString().slice(0, 10)
}

export interface BuildActivationSettlementInput {
  contract: Contract
  activationDate: string
  comisionEmpresa: number
  comisionComercial: number
  existing?: Settlement
}

export function buildActivationSettlement(
  input: BuildActivationSettlementInput
): Settlement {
  const { contract, activationDate, comisionEmpresa, comisionComercial, existing } = input

  return {
    id: existing?.id ?? "",
    contractId: contract.id,
    comercialId: contract.comercialId,
    comercialName: contract.comercialName,
    montoInterno: comisionEmpresa,
    montoExterno: comisionComercial,
    estado: "pendiente",
    tipo: contract.tipo,
    tipoEvento: ACTIVATION_SETTLEMENT_EVENTO,
    descripcion: `Comisión de activación — ${contract.clientName} (CUPS: ${contract.cups})`,
    createdAt: activationDate,
  }
}

export interface BuildRetrocomisionSettlementInput {
  contract: Contract
  bajaDate: string
  comisionEmpresa: number
  comisionComercial: number
  descripcion: string
}

export function buildRetrocomisionSettlement(
  input: BuildRetrocomisionSettlementInput
): Settlement {
  const { contract, bajaDate, comisionEmpresa, comisionComercial, descripcion } = input

  return {
    id: "",
    contractId: contract.id,
    comercialId: contract.comercialId,
    comercialName: contract.comercialName,
    montoInterno: comisionEmpresa <= 0 ? comisionEmpresa : -Math.abs(comisionEmpresa),
    montoExterno: comisionComercial <= 0 ? comisionComercial : -Math.abs(comisionComercial),
    estado: "pendiente",
    tipo: contract.tipo,
    tipoEvento: RETROCOMISION_SETTLEMENT_EVENTO,
    descripcion,
    createdAt: bajaDate,
    fechaBaja: bajaDate,
  }
}

/** Se crea al registrar el contrato: comisión provisional, pendiente de confirmación. */
export function buildPendingContractSettlement(input: PendingSettlementInput): Settlement {
  return {
    id: input.id,
    contractId: input.contractId,
    comercialId: input.comercialId,
    comercialName: input.comercialName,
    montoInterno: input.montoInterno,
    montoExterno: input.montoExterno,
    estado: "pendiente",
    tipo: input.tipo,
    descripcion: `Comisión pendiente de confirmación — ${input.clientName}`,
    createdAt: input.createdAt,
  }
}

export interface ActivationSettlementInput {
  contract: Contract
  commissionPct: number
  totalCom: number
  comercialShare: number
  jefeShare: number
  managerId: string | null
  managerName: string | null
  activationDate: string
}

export interface ActivationSettlementResult {
  settlements: Settlement[]
  /** Filas existentes que hay que actualizar (mismo id, importes confirmados). */
  updates: Array<{ id: string; patch: Partial<Settlement> }>
  /** Override de jefe: solo se crea aquí si no existía fila previa. */
  creates: Settlement[]
}

/**
 * Confirma las comisiones al activar el contrato. El comercial ya tiene una
 * liquidación creada en el alta: se actualiza, no se duplica. El override del
 * jefe solo aparece en la activación porque hasta entonces no se calcula.
 */
export function applyActivationSettlements(
  settlements: Settlement[],
  input: ActivationSettlementInput
): ActivationSettlementResult {
  const {
    contract,
    commissionPct,
    totalCom,
    comercialShare,
    jefeShare,
    managerId,
    managerName,
    activationDate,
  } = input

  const updates: ActivationSettlementResult["updates"] = []
  const creates: Settlement[] = []
  let next = [...settlements]

  function upsert(
    comercialId: string,
    comercialName: string,
    montoExterno: number,
    descripcion: string,
    createId: string
  ) {
    if (montoExterno <= 0) return

    const existing = findContractCommissionSettlement(next, contract.id, comercialId)
    if (existing) {
      const patch: Partial<Settlement> = {
        montoInterno: totalCom,
        montoExterno,
        descripcion,
      }
      next = next.map((s) => (s.id === existing.id ? { ...s, ...patch } : s))
      updates.push({ id: existing.id, patch })
      return
    }

    const created: Settlement = {
      id: createId,
      contractId: contract.id,
      comercialId,
      comercialName,
      montoInterno: totalCom,
      montoExterno,
      estado: "pendiente",
      tipo: contract.tipo,
      descripcion,
      createdAt: activationDate,
    }
    creates.push(created)
    next = [created, ...next]
  }

  upsert(
    contract.comercialId,
    contract.comercialName,
    comercialShare,
    `Comisión confirmada (${commissionPct}%) — Contrato activo: ${contract.clientName} (CUPS: ${contract.cups})`,
    `liq-auto-c-${Date.now()}`
  )

  if (managerId && managerName && jefeShare > 0) {
    upsert(
      managerId,
      managerName,
      jefeShare,
      `Override jefe comercial — Contrato activo: ${contract.clientName} (${contract.comercialName})`,
      `liq-auto-j-${Date.now()}`
    )
  }

  return { settlements: next, updates, creates }
}
