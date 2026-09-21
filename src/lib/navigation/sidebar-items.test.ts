import { describe, expect, it } from "vitest"
import { getVisibleSidebarItems } from "./sidebar-items"

describe("getVisibleSidebarItems", () => {
  it("muestra Usuarios al superadmin en tramitación y en vista comercial", () => {
    const tramitacion = getVisibleSidebarItems({
      activeModule: "erp",
      activeRole: "superadmin",
      superadminViewMode: "tramitacion",
    })
    const comercial = getVisibleSidebarItems({
      activeModule: "erp",
      activeRole: "superadmin",
      superadminViewMode: "comercial",
    })

    expect(tramitacion.some((item) => item.name === "Usuarios")).toBe(true)
    expect(comercial.some((item) => item.name === "Usuarios")).toBe(true)
  })
})
