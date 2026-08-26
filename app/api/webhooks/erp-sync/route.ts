import {
  erpSyncResultToResponse,
  handleErpSyncWebhook,
} from "@/lib/webhooks/erp-sync-handler"

/**
 * Supabase Database Webhook → CRM fidelización.
 *
 * Configura en Supabase Dashboard:
 * - Tabla: public.contratos_erp
 * - Eventos: INSERT, UPDATE
 * - Header: x-webhook-secret = valor de ERP_SYNC_WEBHOOK_SECRET
 *
 * Variables de entorno requeridas:
 * - ERP_SYNC_WEBHOOK_SECRET
 * - SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL)
 * - SUPABASE_SERVICE_ROLE_KEY
 */
export async function POST(request: Request) {
  const result = await handleErpSyncWebhook(request)
  return erpSyncResultToResponse(result)
}

export async function GET() {
  return Response.json(
    {
      service: "erp-sync",
      status: "ready",
      method: "POST",
    },
    { status: 200 }
  )
}
