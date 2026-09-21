import { describe, expect, it } from "vitest"
import { defaultPermissionsForRole } from "@/types/profile"
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

  it("oculta Contratos y Comparador cuando el comercial no tiene permisos", () => {
    const permissions = {
      ...defaultPermissionsForRole("comercial"),
      contractsView: false,
      comparatorAccess: false,
    }
    const items = getVisibleSidebarItems({
      activeModule: "erp",
      activeRole: "comercial",
      superadminViewMode: "tramitacion",
      staffPermissions: permissions,
    })

    expect(items.some((item) => item.name === "Contratos")).toBe(false)
    expect(items.some((item) => item.name === "Comparador")).toBe(false)
    expect(items.some((item) => item.name === "Historial de Comparativas")).toBe(false)
  })

  it("oculta Usuarios a tramitación, jefe y comercial", () => {
    for (const activeRole of ["tramitacion", "jefe_comercial", "comercial"] as const) {
      const items = getVisibleSidebarItems({
        activeModule: "erp",
        activeRole,
        superadminViewMode: "tramitacion",
      })
      expect(items.some((item) => item.name === "Usuarios")).toBe(false)
    }
  })
})
