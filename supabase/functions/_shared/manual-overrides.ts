export type ManualOverrides = Record<string, boolean>

export const CONTRACT_SYNC_OMIT_ALWAYS = [
  'comercial_id',
  'monto_interno',
  'monto_externo',
  'consumo_anual_manual',
  'comentarios_internos',
  'documentos',
  'jefe_equipo',
] as const

export function parseManualOverrides(raw: unknown): ManualOverrides {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: ManualOverrides = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === true) out[key] = true
  }
  return out
}

export function omitOverriddenFields<T extends Record<string, unknown>>(
  row: T,
  overrides: ManualOverrides
): T {
  const next = { ...row }
  for (const column of Object.keys(overrides)) {
    if (overrides[column] && column in next) {
      delete next[column]
    }
  }
  return next
}

export function omitErpOwnedContractFields<T extends Record<string, unknown>>(row: T): T {
  const next = { ...row }
  for (const column of CONTRACT_SYNC_OMIT_ALWAYS) {
    delete next[column]
  }
  return next
}

