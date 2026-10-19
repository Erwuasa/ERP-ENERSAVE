import { describe, expect, it } from "vitest"
import { OWNER_EMAIL } from "@/lib/owner-access"
import { canAccessEnertechLogs, isEnertechLogsSegment } from "./enertech-logs-access"

describe("canAccessEnertechLogs", () => {
  it("allows tramitacion and owner superadmin only among superadmins", () => {
    expect(canAccessEnertechLogs("tramitacion", "any@example.com")).toBe(true)
    expect(canAccessEnertechLogs("superadmin", OWNER_EMAIL)).toBe(true)
    expect(canAccessEnertechLogs("superadmin", "other@example.com")).toBe(false)
    expect(canAccessEnertechLogs("comercial", OWNER_EMAIL)).toBe(false)
  })

  it("keeps the old webhook path as an alias of /erp/logs", () => {
    expect(isEnertechLogsSegment("logs")).toBe(true)
    expect(isEnertechLogsSegment("enertech-webhooks")).toBe(true)
    expect(isEnertechLogsSegment("contratos")).toBe(false)
  })
})
