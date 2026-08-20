import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseClient, isSupabaseConfigured } from "./client"
import type { ProspectoRow } from "./ventas-types"

export type VentasResult<T> =
  | { ok: true; data: T }
  | {
      ok: false
      reason: "not_configured" | "table_missing" | "rls_denied" | "error"
      message: string
    }

export function mapSupabaseError(error: { code?: string; message: string }): VentasResult<never> {
  const isMissingTable =
    error.code === "42P01" || error.message.toLowerCase().includes("does not exist")
  const isRls =
    error.code === "42501" || error.message.toLowerCase().includes("row-level security")
  return {
    ok: false,
    reason: isMissingTable ? "table_missing" : isRls ? "rls_denied" : "error",
    message: error.message,
  }
}

export function isVentasFailure(
  value: SupabaseClient | VentasResult<never>
): value is VentasResult<never> {
  return typeof value === "object" && value !== null && "ok" in value && value.ok === false
}

export function requireSupabase(): SupabaseClient | VentasResult<never> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Supabase no está configurado. Añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.",
    }
  }
  const supabase = getSupabaseClient()
  if (!supabase) {
    return {
      ok: false,
      reason: "not_configured",
      message: "No se pudo inicializar el cliente de Supabase.",
    }
  }
  return supabase
}

export function readMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
): string | undefined {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export function parseRpcProspectoRow(data: unknown): ProspectoRow {
  if (typeof data === "string") {
    return JSON.parse(data) as ProspectoRow
  }
  return data as ProspectoRow
}
