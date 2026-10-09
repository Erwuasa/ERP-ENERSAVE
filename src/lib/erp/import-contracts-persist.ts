import { contractSupplyKey, mergeErpCrmState } from "@/lib/clients"
import { ensureClientForContract } from "@/lib/erp/persist-client-for-contract"
import {
  importedRowsToContracts,
  type ImportedContractRow,
} from "@/lib/excel-import"
import { applyCupsComercialAssignmentToContract } from "@/lib/contract-import-cups-assign"
import { isContractActivado, normalizeContractEstado } from "@/lib/contract-estado"
import { insertTeamContractFromImport } from "@/lib/supabase/contracts"
import {
  persistEstimatedCommissionSettlement,
  syncActiveContractCommissionSettlement,
} from "@/lib/erp/sync-contract-commission-settlement"
import type { Settlement } from "@/types/settlement"
import type { Client } from "@/types/client"
import type { Contract } from "@/types/contract"
import type { Profile } from "@/types/profile"

type ImportDefaults = {
  comercialId: string
  comercialName: string
  existingCount: number
}

export type ImportContractsPersistResult = {
  ok: true
  contracts: Contract[]
  clients: Client[]
  importedCount: number
  warnings: string[]
  settlements: Settlement[]
}

function inferTipoClienteFromRow(row: ImportedContractRow): "particular" | "empresa" {
  const raw = (row.tipoCliente ?? "").toLowerCase()
  if (raw.includes("pyme") || raw.includes("empresa") || raw.includes("autonom")) {
    return "empresa"
  }
  return "particular"
}

export async function persistImportedContracts(
  rows: ImportedContractRow[],
  defaults: ImportDefaults,
  clients: Client[],
  existingContracts: Contract[]
): Promise<ImportContractsPersistResult> {
  const draftContracts = importedRowsToContracts(rows, defaults)
  return persistImportedContractList(draftContracts, clients, existingContracts, rows)
}

export async function persistImportedContractList(
  draftContracts: Contract[],
  clients: Client[],
  existingContracts: Contract[],
  sourceRows?: ImportedContractRow[],
  profiles: Profile[] = []
): Promise<ImportContractsPersistResult> {
  let nextClients = clients
  const persisted: Contract[] = []
  const warnings: string[] = []
  const settlements: Settlement[] = []
  const seenSupply = new Set(existingContracts.map((contract) => contractSupplyKey(contract)))

  for (let i = 0; i < draftContracts.length; i++) {
    const assignedDraft = applyCupsComercialAssignmentToContract(draftContracts[i], profiles)
    const sourceRow = sourceRows?.[i]

    const { clients: withClient, client } = await ensureClientForContract(nextClients, {
      nombre: assignedDraft.clientName,
      comercialId: assignedDraft.comercialId,
      documento: assignedDraft.nif,
      telefono: assignedDraft.telefono,
      email: assignedDraft.email,
      direccion: assignedDraft.direccionSuministro,
      codigoPostal: assignedDraft.codigoPostal,
      ciudad: assignedDraft.poblacion,
      provincia: assignedDraft.provincia,
      tipoCliente: sourceRow
        ? inferTipoClienteFromRow(sourceRow)
        : assignedDraft.tipoCliente?.includes("pyme")
          ? "empresa"
          : "particular",
    })
    nextClients = withClient

    const withClientId: Contract = { ...assignedDraft, clientId: client.id }
    const supplyKey = contractSupplyKey(withClientId)
    if (seenSupply.has(supplyKey)) {
      warnings.push(
        `${assignedDraft.clientName} (${assignedDraft.cups}): ya existía el mismo CUPS, tipo y estado. No se duplicó.`
      )
      continue
    }
    seenSupply.add(supplyKey)

    const saveResult = await insertTeamContractFromImport(withClientId)

    let saved: Contract
    if (saveResult.ok === false) {
      warnings.push(
        `${assignedDraft.clientName} (${assignedDraft.cups}): ${saveResult.message ?? "No se pudo guardar en Supabase"}`
      )
      saved = withClientId
      persisted.push(saved)
    } else {
      saved = { ...withClientId, id: saveResult.id }
      persisted.push(saved)
    }

    if (saveResult.ok) {
      const estado = normalizeContractEstado(saved.estado)
      const syncResult = isContractActivado(estado)
        ? await syncActiveContractCommissionSettlement(saved, settlements)
        : await persistEstimatedCommissionSettlement(saved)
      if (syncResult.settlement) {
        settlements.push(syncResult.settlement)
      } else if (syncResult.warning && !syncResult.warning.includes("Ya existía")) {
        warnings.push(`${saved.clientName}: ${syncResult.warning}`)
      }
    }
  }

  const merged = mergeErpCrmState(nextClients, [...persisted, ...existingContracts])

  return {
    ok: true,
    contracts: merged.contracts,
    clients: merged.clients,
    importedCount: persisted.length,
    warnings,
    settlements,
  }
}
