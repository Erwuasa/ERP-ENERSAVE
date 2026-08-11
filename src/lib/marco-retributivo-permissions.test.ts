import { describe, expect, it } from "vitest"
import { canEditMarcoRetributivo } from "./marco-retributivo-permissions"

describe("canEditMarcoRetributivo", () => {
  it("allows superadmin in operativo/tramitacion view", () => {
    expect(canEditMarcoRetributivo("superadmin")).toBe(true)
    expect(
      canEditMarcoRetributivo("superadmin", { superadminViewMode: "tramitacion" })
    ).toBe(true)
  })

  it("blocks superadmin in comercial view", () => {
    expect(
      canEditMarcoRetributivo("superadmin", { superadminViewMode: "comercial" })
    ).toBe(false)
  })

  it("allows tramitacion", () => {
    expect(canEditMarcoRetributivo("tramitacion")).toBe(true)
  })

  it("blocks comercial and jefe_comercial", () => {
    expect(canEditMarcoRetributivo("comercial")).toBe(false)
    expect(canEditMarcoRetributivo("jefe_comercial")).toBe(false)
  })
})
