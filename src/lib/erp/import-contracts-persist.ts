import { linkContractsToClients, syncClientEstados } from "@/lib/clients"
import { ensureClientForContract } from "@/lib/erp/persist-client-for-contract"
import {
  importedRowsToContracts,
  type ImportedContractRow,
} from "@/lib/excel-import"
import { insertTeamContractFromImport } from "@/lib/supabase/contracts"
import type { Client } from "@/types/client"
import type { Contract } from "@/types/contract"

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
  sourceRows?: ImportedContractRow[]
): Promise<ImportContractsPersistResult> {
  let nextClients = clients
  const persisted: Contract[] = []
  const warnings: string[] = []

  for (let i = 0; i < draftContracts.length; i++) {
    const draft = draftContracts[i]
    const sourceRow = sourceRows?.[i]

    const { clients: withClient, client } = await ensureClientForContract(nextClients, {
      nombre: draft.clientName,
      comercialId: draft.comercialId,
      documento: draft.nif,
      telefono: draft.telefono,
      email: draft.email,
      direccion: draft.direccionSuministro,
      tipoCliente: sourceRow
        ? inferTipoClienteFromRow(sourceRow)
        : draft.tipoCliente?.includes("pyme")
          ? "empresa"
          : "particular",
    })
    nextClients = withClient

    const withClientId: Contract = { ...draft, clientId: client.id }
    const saveResult = await insertTeamContractFromImport(withClientId)

    if (saveResult.ok) {
      persisted.push({ ...withClientId, id: saveResult.id })
    } else {
      warnings.push(
        `${draft.clientName} (${draft.cups}): ${saveResult.message ?? "No se pudo guardar en Supabase"}`
      )
      persisted.push(withClientId)
    }
  }

  const allContracts = [...persisted, ...existingContracts]
  const linked = linkContractsToClients(allContracts, nextClients)
  const syncedClients = syncClientEstados(nextClients, linked)

  return {
    ok: true,
    contracts: linked,
    clients: syncedClients,
    importedCount: persisted.length,
    warnings,
  }
}
