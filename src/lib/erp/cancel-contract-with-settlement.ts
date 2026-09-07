import type { Contract } from "@/types/contract"
import type { Settlement } from "@/types/settlement"
import { normalizeContractEstado } from "@/lib/contract-estado"
import {
  buildRetrocomisionClawbackDescription,
  computeRetrocomisionClawback,
} from "@/lib/erp/contract-clawback"
import { updateTeamContract } from "@/lib/supabase/contracts"
import { listRetrocomisionSchedules } from "@/lib/supabase/retrocomision-schedules"
import { createRetrocomisionSettlement } from "@/lib/supabase/settlements"
import { buildRetrocomisionSettlement } from "@/lib/contract-settlements"

export interface CancelContractWithSettlementInput {
  contract: Contract
  bajaDate: string
  existingSettlements: Settlement[]
  audit?: {
    autorId: string
    autorNombre: string
    estadoAnterior: string
  }
}

export type CancelContractWithSettlementResult =
  | {
      ok: true
      contract: Contract
      settlement: Settlement | null
      clawbackAmount: number
      created: boolean
    }
  | {
      ok: false
      message: string
    }

export async function cancelContractWithSettlement(
  input: CancelContractWithSettlementInput
): Promise<CancelContractWithSettlementResult> {
  const { contract, bajaDate, existingSettlements, audit } = input

  const schedulesResult = await listRetrocomisionSchedules()
  if (schedulesResult.ok === false) {
    return { ok: false, message: schedulesResult.message }
  }

  const clawback = computeRetrocomisionClawback(
    contract,
    bajaDate,
    schedulesResult.data,
    existingSettlements
  )

  if (clawback.isInvalidDate) {
    return {
      ok: false,
      message: "La fecha de baja no puede ser anterior a la fecha de activación.",
    }
  }

  const contractPatch: Partial<Contract> = {
    estado: "Dado de Baja",
    fechaBaja: bajaDate,
    retrocomisionClawback: clawback.hasClawback ? clawback.clawbackAmount : 0,
  }

  const contractResult = await updateTeamContract(contract.id, contractPatch, {
    audit: audit
      ? {
          autorId: audit.autorId,
          autorNombre: audit.autorNombre,
          estadoAnterior: audit.estadoAnterior,
        }
      : undefined,
  })

  if (contractResult.ok === false) {
    return { ok: false, message: contractResult.message }
  }

  if (!clawback.hasClawback || clawback.clawbackAmount <= 0) {
    return {
      ok: true,
      contract: contractResult.data,
      settlement: null,
      clawbackAmount: 0,
      created: false,
    }
  }

  const settlementDraft = buildRetrocomisionSettlement({
    contract,
    bajaDate,
    comisionEmpresa: clawback.internalClawback,
    comisionComercial: clawback.clawbackAmount,
    descripcion: buildRetrocomisionClawbackDescription(contract, clawback),
  })

  const settlementResult = await createRetrocomisionSettlement(settlementDraft)
  if (settlementResult.ok === false) {
    return { ok: false, message: settlementResult.message }
  }

  return {
    ok: true,
    contract: contractResult.data,
    settlement: settlementResult.data.settlement,
    clawbackAmount: clawback.clawbackAmount,
    created: settlementResult.data.created,
  }
}

export function cancelContractEstadoAnterior(contract: Contract): string {
  return normalizeContractEstado(contract.estado)
}
