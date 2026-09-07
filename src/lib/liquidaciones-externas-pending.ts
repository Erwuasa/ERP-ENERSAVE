import { isRetrocomisionSettlement } from "@/lib/liquidaciones-internas"
import type { PendingLiquidacionContract } from "@/pages/erp/liquidaciones-externas/lib/liquidaciones-externas-types"
import type { Contract } from "@/types/contract"
import type { Settlement } from "@/types/settlement"

function formatLiquidacionDate(value?: string): string {
  if (!value?.trim()) return "—"
  const iso = value.includes("T") ? value : `${value.trim().slice(0, 10)}T12:00:00`
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return "—"
  return parsed.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function contractCode(contract: Contract): string {
  if (contract.referencia?.trim()) return contract.referencia.trim()
  return contract.id.slice(0, 8).toUpperCase()
}

export function isSettlementEligibleForExternasConsolidation(settlement: Settlement): boolean {
  if (settlement.estado !== "pendiente") return false
  if (isRetrocomisionSettlement(settlement)) return false
  return settlement.montoInterno > 0
}

export function buildPendingLiquidacionContractsFromSettlements(
  settlements: Settlement[],
  contracts: Contract[],
  checkedIds: ReadonlySet<string>
): PendingLiquidacionContract[] {
  const contractById = new Map(contracts.map((contract) => [contract.id, contract]))

  const pending: PendingLiquidacionContract[] = []

  for (const settlement of settlements) {
    if (!isSettlementEligibleForExternasConsolidation(settlement)) continue
    if (!settlement.contractId) continue

    const contract = contractById.get(settlement.contractId)
    if (!contract) continue

    pending.push({
      id: settlement.id,
      settlementId: settlement.id,
      contractId: settlement.contractId,
      code: contractCode(contract),
      cups: contract.cups,
      dateFirm: formatLiquidacionDate(contract.createdAt),
      dateAct: formatLiquidacionDate(contract.estadoEfectivoDesde ?? contract.createdAt),
      direction:
        contract.direccionSuministro?.trim() ||
        contract.direccionCompleta?.trim() ||
        "—",
      agentId: settlement.comercialId,
      agentName: settlement.comercialName,
      brand: contract.compania,
      tariff: contract.tarifa || contract.atr || "—",
      price: settlement.montoInterno,
      checked: checkedIds.has(settlement.id),
      clientName: contract.clientName,
      tipo: contract.tipo,
    })
  }

  return pending.sort((a, b) => a.brand.localeCompare(b.brand, "es"))
}
