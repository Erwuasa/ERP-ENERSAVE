import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseClient, isSupabaseConfigured } from "./client"

export type SupabaseFailureReason =
  | "not_configured"
  | "table_missing"
  | "rls_denied"
  | "error"

export interface SupabaseFailure {
  ok: false
  reason: SupabaseFailureReason
  message: string
}

export type SupabaseResult<T> = { ok: true; data: T; message?: undefined } | SupabaseFailure

export type ResolvedClient = { ok: true; client: SupabaseClient } | SupabaseFailure

/** Precondiciones comunes a todas las operaciones: config presente y cliente inicializable. */
export function resolveSupabaseClient(): ResolvedClient {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message:
        "Supabase no está configurado. Añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.",
    }
  }

  const client = getSupabaseClient()
  if (!client) {
    return {
      ok: false,
      reason: "not_configured",
      message: "No se pudo inicializar el cliente de Supabase.",
    }
  }

  return { ok: true, client }
}

/** Traduce un error de PostgREST distinguiendo «la tabla no existe» del resto. */
export function toSupabaseFailure(
  error: { code?: string; message: string },
  table: string
): SupabaseFailure {
  const message = error.message ?? ""
  const lower = message.toLowerCase()

  if (error.code === "42501" || lower.includes("row-level security")) {
    return { ok: false, reason: "rls_denied", message }
  }

  const isMissingTable =
    error.code === "42P01" ||
    lower.includes(`relation "public.${table}" does not exist`) ||
    lower.includes(`relation "${table}" does not exist`)

  return {
    ok: false,
    reason: isMissingTable ? "table_missing" : "error",
    message,
  }
}

export type Row = Record<string, unknown>

export function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

export function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

export function bool(value: unknown): boolean {
  return value === true || value === "true"
}

/** Fecha ISO corta (YYYY-MM-DD) a partir de una columna date o timestamptz. */
export function isoDate(value: unknown): string | undefined {
  const raw = str(value)
  return raw ? raw.slice(0, 10) : undefined
}

/**
 * Convierte un patch camelCase a columnas snake_case, omitiendo las claves
 * ausentes para no sobrescribir columnas con undefined.
 */
export function mapPatchToRow<T>(
  patch: Partial<T>,
  columns: Partial<Record<keyof T, string>>
): Row {
  const row: Row = {}
  for (const [field, column] of Object.entries(columns) as [keyof T, string][]) {
    const value = patch[field]
    if (value !== undefined) row[column] = value
  }
  return row
}
