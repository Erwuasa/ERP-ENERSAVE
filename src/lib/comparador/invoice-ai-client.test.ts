import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

describe("resolveInvoiceAiEndpoint via isInvoiceAiConfigured", () => {
  const envBackup = { ...import.meta.env }

  beforeEach(() => {
    vi.stubEnv("VITE_INVOICE_AI_KEY", "pk-test")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    Object.assign(import.meta.env, envBackup)
  })

  it("añade /functions/v1/ai-assistant si la URL es solo el proyecto", async () => {
    vi.stubEnv("VITE_INVOICE_AI_ASSISTANT_URL", "https://unxrvwuaqhwogwvynoyq.supabase.co")
    vi.stubEnv("SUPABASE_URL", "")
    const { isInvoiceAiConfigured } = await import("./invoice-ai-client")
    expect(isInvoiceAiConfigured()).toBe(true)
  })
})
