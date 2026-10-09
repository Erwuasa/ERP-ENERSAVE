import { describe, expect, it } from "vitest"
import { AT_OUTBOUND_OWNER_EMAIL } from "@/lib/at-outbound-map"
import { canAccessEnertechWebhookAudit } from "./enertech-webhook-audit-access"

describe("canAccessEnertechWebhookAudit", () => {
  it("allows tramitacion and owner superadmin only among superadmins", () => {
    expect(canAccessEnertechWebhookAudit("tramitacion", "any@example.com")).toBe(true)
    expect(canAccessEnertechWebhookAudit("superadmin", AT_OUTBOUND_OWNER_EMAIL)).toBe(true)
    expect(canAccessEnertechWebhookAudit("superadmin", "other@example.com")).toBe(false)
    expect(canAccessEnertechWebhookAudit("comercial", AT_OUTBOUND_OWNER_EMAIL)).toBe(false)
  })
})
