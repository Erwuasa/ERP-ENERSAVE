import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  handleErpSyncWebhook,
  proximoContactoEn30Dias,
} from "./erp-sync-handler"
import { ERP_SYNC_WEBHOOK_SECRET_HEADER } from "./erp-sync-types"

const VALID_SECRET = "test-webhook-secret-32chars!!"

function buildRequest(
  body: unknown,
  secret = VALID_SECRET,
  headers: Record<string, string> = {}
): Request {
  return new Request("https://example.com/api/webhooks/erp-sync", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [ERP_SYNC_WEBHOOK_SECRET_HEADER]: secret,
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

const activadoPayload = {
  type: "UPDATE" as const,
  table: "contratos_erp",
  schema: "public",
  record: {
    id: "ctr-erp-1",
    estado: "Activado",
    prospecto_id: "prosp-uuid-1",
    id_asesor: "asesor-uuid-1",
  },
  old_record: {
    id: "ctr-erp-1",
    estado: "Tramitando",
    prospecto_id: "prosp-uuid-1",
  },
}

describe("handleErpSyncWebhook", () => {
  beforeEach(() => {
    vi.stubEnv("ERP_SYNC_WEBHOOK_SECRET", VALID_SECRET)
    vi.stubEnv("SUPABASE_URL", "https://test.supabase.co")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key")
  })

  it("returns 401 when secret is missing or invalid", async () => {
    const missing = await handleErpSyncWebhook(
      buildRequest(activadoPayload, "")
    )
    expect(missing.status).toBe(401)
    expect(missing.body.error).toBe("unauthorized")

    const invalid = await handleErpSyncWebhook(
      buildRequest(activadoPayload, "wrong-secret")
    )
    expect(invalid.status).toBe(401)
  })

  it("returns 200 skipped for non-activado updates", async () => {
    const result = await handleErpSyncWebhook(
      buildRequest({
        type: "UPDATE",
        table: "contratos_erp",
        schema: "public",
        record: { id: "1", estado: "Tramitando" },
        old_record: { id: "1", estado: "PTE DE FIRMA" },
      })
    )
    expect(result.status).toBe(200)
    expect(result.body.skipped).toBe(true)
  })

  it("proximoContactoEn30Dias adds 30 calendar days", () => {
    const ref = new Date("2026-06-17T12:00:00.000Z")
    const proximo = proximoContactoEn30Dias(ref)
    expect(proximo).toBe(new Date("2026-07-17T12:00:00.000Z").toISOString())
  })
})
