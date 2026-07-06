export type SupabaseWebhookEventType = "INSERT" | "UPDATE" | "DELETE"

/** Row shape emitted by Supabase Database Webhooks for `public.contratos_erp`. */
export interface ContratoErpRecord {
  id: string
  estado: string
  prospecto_id?: string | null
  id_asesor?: string | null
  comercial_id?: string | null
  contrato_equipo_id?: string | null
}

export interface SupabaseDatabaseWebhookPayload {
  type: SupabaseWebhookEventType
  table: string
  schema: string
  record: ContratoErpRecord | null
  old_record: ContratoErpRecord | null
}

export const ERP_SYNC_WEBHOOK_SECRET_HEADER = "x-webhook-secret"

export const ACTIVADO_ESTADOS = new Set(["ACTIVADO", "Activado", "activado"])
