import {
  buildActivationSettlement,
  buildPendingContractSettlement,
  findActivationSettlement,
  findContractCommissionSettlement,
  resolveActivationDate,
} from "@/lib/contract-settlements"
import { isContractActivado, normalizeContractEstado } from "@/lib/contract-estado"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import {
  createActivationSettlement,
  createSettlement,
  updateSettlement,
} from "@/lib/supabase/settlements"
import type { Contract } from "@/types/contract"
import type { Settlement } from "@/types/settlement"

function isPersistableContractId(contractId: string): boolean {
  return Boolean(contractId?.trim()) && !contractId.startsWith("con-")
}

export async function persistEstimatedCommissionSettlement(
  contract: Contract
): Promise<{ settlement?: Settlement; warning?: string }> {
  if (!isSupabaseConfigured()) return {}
  if (!isPersistableContractId(contract.id)) return {}
  if (contract.montoExterno <= 0 && contract.montoInterno <= 0) return {}

  const draft = buildPendingContractSettlement({
    id: "",
    contractId: contract.id,
    comercialId: contract.comercialId,
    comercialName: contract.comercialName,
    montoInterno: contract.montoInterno,
    montoExterno: contract.montoExterno,
    tipo: contract.tipo,
    clientName: contract.clientName,
    createdAt: (contract.createdAt ?? new Date().toISOString()).slice(0, 10),
  })

  draft.descripcion = `Comisión estimada — ${contract.clientName} (CUPS: ${contract.cups})`

  const result = await createSettlement(draft)
  if (result.ok === false) {
    if (/duplicate key|unique constraint/i.test(result.message)) {
      return { warning: "Ya existía liquidación para este contrato." }
    }
    return { warning: result.message }
  }

  return { settlement: result.data }
}

export async function syncActiveContractCommissionSettlement(
  contract: Contract,
  existingSettlements: Settlement[] = []
): Promise<{ settlement?: Settlement; warning?: string }> {
  if (!isSupabaseConfigured()) return {}
  if (!isPersistableContractId(contract.id)) return {}
  if (!isContractActivado(normalizeContractEstado(contract.estado))) return {}
  if (contract.montoExterno <= 0 && contract.montoInterno <= 0) return {}

  const activationDate = resolveActivationDate(contract)
  const existingLocal =
    findActivationSettlement(existingSettlements, contract.id) ??
    findContractCommissionSettlement(
      existingSettlements,
      contract.id,
      contract.comercialId
    )

  const draft = buildActivationSettlement({
    contract,
    activationDate,
    comisionEmpresa: contract.montoInterno,
    comisionComercial: contract.montoExterno,
    existing: existingLocal,
  })

  const result = await createActivationSettlement(draft)
  if (result.ok === false) {
    return { warning: result.message }
  }

  return { settlement: result.data.settlement }
}

export async function syncSettlementOwnerForContract(
  contract: Contract,
  existingSettlements: Settlement[]
): Promise<{ settlement?: Settlement; warning?: string }> {
  if (!isSupabaseConfigured()) return {}
  if (!isPersistableContractId(contract.id)) return {}

  const target =
    findActivationSettlement(existingSettlements, contract.id) ??
    findContractCommissionSettlement(
      existingSettlements,
      contract.id,
      contract.comercialId
    ) ??
    existingSettlements.find((s) => s.contractId === contract.id)

  if (!target) {
    if (isContractActivado(normalizeContractEstado(contract.estado))) {
      return syncActiveContractCommissionSettlement(contract, existingSettlements)
    }
    return persistEstimatedCommissionSettlement(contract)
  }

  if (
    target.comercialId === contract.comercialId &&
    target.comercialName === contract.comercialName &&
    target.montoExterno === contract.montoExterno &&
    target.montoInterno === contract.montoInterno
  ) {
    return { settlement: target }
  }

  const updateResult = await updateSettlement(
    target.id,
    {
      comercialId: contract.comercialId,
      comercialName: contract.comercialName,
      montoExterno: contract.montoExterno > 0 ? contract.montoExterno : target.montoExterno,
      montoInterno: contract.montoInterno > 0 ? contract.montoInterno : target.montoInterno,
      contractId: contract.id,
    },
    { markManualOverrides: false }
  )

  if (updateResult.ok === false) {
    return { warning: updateResult.message }
  }

  return { settlement: updateResult.data }
}
