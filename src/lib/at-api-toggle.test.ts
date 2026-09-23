import { describe, expect, it } from "vitest"
import { AT_OUTBOUND_OWNER_EMAIL } from "./at-outbound-map"
import { canToggleAtOutboundApi } from "./at-api-toggle"

describe("canToggleAtOutboundApi", () => {
  it("solo permite el toggle al superadmin Germán Bayón", () => {
    expect(canToggleAtOutboundApi("superadmin", AT_OUTBOUND_OWNER_EMAIL)).toBe(true)
    expect(canToggleAtOutboundApi("superadmin", "otro@enersave.es")).toBe(false)
    expect(canToggleAtOutboundApi("comercial", AT_OUTBOUND_OWNER_EMAIL)).toBe(false)
  })
})
