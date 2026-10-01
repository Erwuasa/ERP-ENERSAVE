import {
  applyCupsComercialAssignmentToContract,
  IMPORT_COMERCIAL_DISPLAY_NAME,
  IMPORT_COMERCIAL_JEFE_ID,
} from "@/lib/contract-import-cups-assign"
import {
  importedRowsToContracts,
  parseContractsFromExcelWithReport,
  type ImportedContractRow,
} from "@/lib/excel-import"
import type { SupabaseClient } from "@supabase/supabase-js"
import { buildTeamContractRowFromImport } from "@/lib/supabase/contracts"
import type { Contract } from "@/types/contract"

export type SyncCrmExcelResult = {
  inserted: number
  updated: number
  clientsCreated: number
  clientsLinked: number
  skipped: number
  errors: string[]
}

function normalizeCups(cups: string): string {
  return cups.replace(/\s/g, "").toUpperCase()
}

function inferTipoCliente(row: ImportedContractRow): "particular" | "empresa" {
  const name = row.clientName.toUpperCase()
  if (
    name.includes(" S.L") ||
    name.includes(" SL") ||
    name.includes(" S.L.U") ||
    name.includes(" S A") ||
    name.includes(" S.L.L")
  ) {
    return "empresa"
  }
  return "particular"
}

async function findOrCreateCliente(
  supabase: SupabaseClient,
  input: {
  nombre: string
  nif?: string
  telefono?: string
  comercialId: string
  codigoPostal?: string
  localidad?: string
  provincia?: string
  direccion?: string
  tipoCliente: "particular" | "empresa"
  }
): Promise<{ id: string; created: boolean }> {
  const nif = input.nif?.trim().toUpperCase()
  if (nif) {
    const { data: byNifRows } = await supabase
      .from("clientes")
      .select("id, comercial_id, nif_cif")
      .or(`nif_cif.eq.${nif},nif_cif.ilike.${nif.replace(/[\s.-]/g, "")}`)
      .limit(20)

    const byNif = (byNifRows ?? []).find(
      (row) =>
        String(row.nif_cif ?? "")
          .replace(/[\s.-]/g, "")
          .toUpperCase() === nif.replace(/[\s.-]/g, "")
    )
    if (byNif?.id) {
      if (byNif.comercial_id !== input.comercialId) {
        await supabase
          .from("clientes")
          .update({ comercial_id: input.comercialId })
          .eq("id", byNif.id)
      }
      return { id: String(byNif.id), created: false }
    }
  }

  const { data: byName } = await supabase
    .from("clientes")
    .select("id")
    .eq("comercial_id", input.comercialId)
    .ilike("nombre", input.nombre.trim())
    .limit(1)
    .maybeSingle()
  if (byName?.id) return { id: String(byName.id), created: false }

  const { data: inserted, error } = await supabase
    .from("clientes")
    .insert({
      nombre: input.nombre.trim(),
      nif_cif: nif ?? null,
      telefono: input.telefono ?? null,
      comercial_id: input.comercialId,
      codigo_postal: input.codigoPostal ?? null,
      localidad: input.localidad ?? null,
      provincia: input.provincia ?? null,
      direccion: input.direccion ?? null,
      tipo_cliente: input.tipoCliente,
      source: "manual",
      estado: "activo",
    })
    .select("id")
    .single()

  if (error || !inserted?.id) {
    throw new Error(error?.message ?? "No se pudo crear cliente")
  }

  return { id: String(inserted.id), created: true }
}

async function findContractByCups(
  supabase: SupabaseClient,
  cups: string,
  clientName: string
): Promise<{ id: string } | null> {
  const key = normalizeCups(cups)
  const { data } = await supabase
    .from("contratos_equipo")
    .select("id, cups, client_name, updated_at")
    .ilike("cups", `${key}%`)
    .limit(30)

  const exact = (data ?? []).filter(
    (row) => normalizeCups(String(row.cups ?? "")) === key
  )
  if (exact.length === 0) return null

  const target = clientName.trim().toLowerCase()
  const byName = exact.find(
    (row) => String(row.client_name ?? "").trim().toLowerCase() === target
  )
  if (byName?.id) return { id: String(byName.id) }

  exact.sort(
    (a, b) =>
      new Date(String(b.updated_at ?? 0)).getTime() -
      new Date(String(a.updated_at ?? 0)).getTime()
  )
  return exact[0]?.id ? { id: String(exact[0].id) } : null
}

function enrichContractFromRow(contract: Contract, row: ImportedContractRow): Contract {
  const assigned = applyCupsComercialAssignmentToContract(contract)
  const jefe =
    assigned.jefeEquipo ??
    IMPORT_COMERCIAL_JEFE_ID[assigned.comercialId ?? ""] ??
    undefined

  return {
    ...assigned,
    jefeEquipo: jefe,
    nombreComercial:
      assigned.nombreComercial ||
      IMPORT_COMERCIAL_DISPLAY_NAME[assigned.comercialId ?? ""] ||
      assigned.comercialName,
    tarifa: row.oferta || row.tarifaPeaje || assigned.tarifa,
    atr: row.tarifaPeaje,
    tipoCliente: row.tipoCliente ?? inferTipoCliente(row),
  }
}

export async function syncCrmExcelBufferToSupabase(
  supabase: SupabaseClient,
  buffer: ArrayBuffer,
  options: { fallbackComercialId: string; fallbackComercialName: string }
): Promise<SyncCrmExcelResult> {
  const { rows } = parseContractsFromExcelWithReport(buffer)
  const drafts = importedRowsToContracts(rows, {
    comercialId: options.fallbackComercialId,
    comercialName: options.fallbackComercialName,
    existingCount: 0,
    profiles: [],
  })

  const result: SyncCrmExcelResult = {
    inserted: 0,
    updated: 0,
    clientsCreated: 0,
    clientsLinked: 0,
    skipped: 0,
    errors: [],
  }

  for (let i = 0; i < drafts.length; i++) {
    const row = rows[i]
    const draft = enrichContractFromRow(drafts[i], row)
    if (!draft.cups || draft.cups === "PENDIENTE") {
      result.skipped++
      continue
    }

    try {
      const comercialId = draft.comercialId?.trim()
      if (!comercialId) {
        result.errors.push(`${row.clientName}: sin comercial asignado`)
        continue
      }

      const cliente = await findOrCreateCliente(supabase, {
        nombre: row.clientName,
        nif: row.nif,
        telefono: row.telefono,
        comercialId,
        codigoPostal: row.codigoPostal,
        localidad: row.poblacion,
        provincia: row.provincia,
        direccion: row.direccionSuministro,
        tipoCliente: inferTipoCliente(row),
      })
      if (cliente.created) result.clientsCreated++
      else result.clientsLinked++

      const withClient: Contract = { ...draft, clientId: cliente.id }
      const dbRow = buildTeamContractRowFromImport(withClient)
      if (row.pagado) {
        dbRow.metadata = {
          ...(typeof dbRow.metadata === "object" && dbRow.metadata ? dbRow.metadata : {}),
          crm_pagado: row.pagado,
          import_source: "crm_aenergetic",
        }
      }

      const existing = await findContractByCups(supabase, draft.cups, row.clientName)
      if (existing) {
        const { error } = await supabase
          .from("contratos_equipo")
          .update(dbRow)
          .eq("id", existing.id)
        if (error) result.errors.push(`${draft.cups}: ${error.message}`)
        else result.updated++
      } else {
        const { error } = await supabase.from("contratos_equipo").insert(dbRow)
        if (error) result.errors.push(`${draft.cups}: ${error.message}`)
        else result.inserted++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.errors.push(`${row.clientName} (${row.cups}): ${msg}`)
    }
  }

  return result
}
