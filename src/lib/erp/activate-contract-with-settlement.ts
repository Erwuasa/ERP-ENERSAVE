import type { Contract } from "@/types/contract"
import type { Profile } from "@/types/profile"
import type { Settlement } from "@/types/settlement"
import {
  aplicaRenovacionAnual,
  computeRenewalSchedule,
} from "@/lib/contract-segment-rules"
import { computeComisionBreakdown } from "@/lib/marco-commission"
import { formatCurrency } from "@/lib/erp/format-currency"
import { updateTeamContract } from "@/lib/supabase/contracts"
import {
  getMarcoEntryById,
  getMarcoRowByAtIds,
  resolveMarcoCatalogEntry,
  listMarcoRetributivo,
  marcoRowToCatalogEntry,
} from "@/lib/supabase/marco-retributivo"
import {
  createActivationSettlement,
} from "@/lib/supabase/settlements"
import {
  buildActivationSettlement,
  findActivationSettlement,
  findContractCommissionSettlement,
  resolveActivationDate,
} from "@/lib/contract-settlements"

export interface ActivateContractWithSettlementInput {
  contract: Contract
  activationDate?: string
  consumoAnual?: number
  existingSettlements: Settlement[]
  profiles: Profile[]
  audit?: {
    autorId: string
    autorNombre: string
    estadoAnterior: string
  }
}

export type ActivateContractWithSettlementResult =
  | {
      ok: true
      contract: Contract
      settlement: Settlement
      created: boolean
    }
  | {
      ok: false
      message: string
    }

export async function activateContractWithSettlement(
  input: ActivateContractWithSettlementInput
): Promise<ActivateContractWithSettlementResult> {
  const {
    contract,
    activationDate: activationDateInput,
    consumoAnual: consumoInput,
    existingSettlements,
    profiles,
    audit,
  } = input

  const activationDate = resolveActivationDate(contract, activationDateInput)
  const consumoAnual = consumoInput ?? contract.consumoAnualManual ?? contract.consumoAnual ?? 0

  let marcoEntry = null
  if (contract.marcoEntryId) {
    const marcoResult = await getMarcoEntryById(contract.marcoEntryId)
    if (marcoResult.ok) marcoEntry = marcoResult.data
  }

  if (!marcoEntry) {
    const marcosResult = await listMarcoRetributivo()
    const marcoRows = marcosResult.ok ? marcosResult.data : []
    marcoEntry = resolveMarcoCatalogEntry(
      contract.marcoEntryId,
      contract.compania,
      contract.tarifa,
      contract.tipo,
      marcoRows
    )
  }

  if (!marcoEntry && (contract.atMarcoId || contract.atRateId)) {
    const byAt = await getMarcoRowByAtIds({
      atMarcoId: contract.atMarcoId,
      atRateId: contract.atRateId,
    })
    if (byAt.ok) marcoEntry = marcoRowToCatalogEntry(byAt.data)
  }

  if (!marcoEntry) {
    return {
      ok: false,
      message:
        "No se encontró entrada del marco retributivo para calcular la comisión de activación.",
    }
  }

  if (consumoAnual <= 0 && marcoEntry.comisionTipo !== "fija") {
    return {
      ok: false,
      message: "Indica un consumo anual válido para calcular la comisión.",
    }
  }

  const comercialProfile =
    profiles.find((profile) => profile.id === contract.comercialId) ??
    profiles.find((profile) => profile.fullName === contract.comercialName)

  const commissionPct =
    comercialProfile?.commissionPercentage ?? (contract.comercialId ? 70 : 0)
  const breakdown = computeComisionBreakdown(
    marcoEntry,
    commissionPct,
    consumoAnual,
    formatCurrency
  )

  const existingLocal =
    findActivationSettlement(existingSettlements, contract.id) ??
    findContractCommissionSettlement(
      existingSettlements,
      contract.id,
      contract.comercialId
    )
  const settlementDraft = buildActivationSettlement({
    contract,
    activationDate,
    comisionEmpresa: breakdown.comisionEmpresa,
    comisionComercial: breakdown.comisionComercial,
    existing: existingLocal,
  })

  const renewalSchedule = aplicaRenovacionAnual({
    tipoCliente: contract.tipoCliente,
    compania: contract.compania,
    clientName: contract.clientName,
    nif: contract.nif,
  })
    ? computeRenewalSchedule(activationDate)
    : { estadoRenovacion: "No aplica" as const }

  const contractPatch: Partial<Contract> = {
    estado: "ACTIVADO",
    estadoEfectivoDesde: activationDate,
    consumoAnual,
    montoInterno: breakdown.comisionEmpresa,
    montoExterno: breakdown.comisionComercial,
    marcoEntryId: contract.marcoEntryId || marcoEntry.id,
    fechaFin: renewalSchedule.fechaRenovacion,
    fechaRenovacion: renewalSchedule.fechaRenovacion,
    diasRenovacion: renewalSchedule.diasRenovacion,
    estadoRenovacion: renewalSchedule.estadoRenovacion,
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

  const settlementResult = await createActivationSettlement(settlementDraft)
  if (settlementResult.ok === false) {
    return { ok: false, message: settlementResult.message }
  }

  return {
    ok: true,
    contract: contractResult.data,
    settlement: settlementResult.data.settlement,
    created: settlementResult.data.created,
  }
}
