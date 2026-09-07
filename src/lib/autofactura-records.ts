import type { AutofacturaRecord, CreateAutofacturaRecordInput } from "../types/autofactura-record"
import { isSupabaseConfigured } from "./supabase/client"
import { createAutofacturaRecord, listAutofacturas } from "./supabase/autofacturas"

export const AUTOFACTURA_GENERATED_EVENT = "enersave:autofactura-generated"

const STORAGE_KEY = "enersave-autofacturas"

function readLocalAutofacturas(): AutofacturaRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AutofacturaRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocalAutofacturas(records: AutofacturaRecord[]): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function createLocalAutofacturaRecord(input: CreateAutofacturaRecordInput): AutofacturaRecord {
  return {
    id: crypto.randomUUID(),
    comercialId: input.comercialId,
    comercialName: input.comercialName,
    periodoMes: input.periodoMes,
    periodoAnio: input.periodoAnio,
    settlementIds: input.settlementIds,
    totalComisionado: input.totalComisionado,
    generatedAt: new Date().toISOString(),
  }
}

export function dispatchAutofacturaGenerated(record: AutofacturaRecord): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(AUTOFACTURA_GENERATED_EVENT, { detail: record }))
}

export async function fetchAutofacturaRecords(): Promise<AutofacturaRecord[]> {
  if (!isSupabaseConfigured()) {
    return readLocalAutofacturas()
  }

  const result = await listAutofacturas()
  if (!result.ok) {
    console.warn(result.message)
    return readLocalAutofacturas()
  }

  return result.data
}

export async function persistAutofacturaRecord(
  input: CreateAutofacturaRecordInput
): Promise<AutofacturaRecord> {
  if (!isSupabaseConfigured()) {
    const record = createLocalAutofacturaRecord(input)
    writeLocalAutofacturas([record, ...readLocalAutofacturas()])
    dispatchAutofacturaGenerated(record)
    return record
  }

  const result = await createAutofacturaRecord(input)
  if (!result.ok) {
    const record = createLocalAutofacturaRecord(input)
    writeLocalAutofacturas([record, ...readLocalAutofacturas()])
    dispatchAutofacturaGenerated(record)
    return record
  }

  dispatchAutofacturaGenerated(result.data)
  return result.data
}
