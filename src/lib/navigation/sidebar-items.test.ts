import { describe, expect, it } from "vitest"
import { AT_OUTBOUND_OWNER_EMAIL } from "@/lib/at-outbound-map"
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

  it("mantiene Contratos para comercial y oculta Comparador sin permiso", () => {
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

    expect(items.some((item) => item.name === "Contratos")).toBe(true)
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
  it("muestra SIPS con el permiso del comparador (tramitación no lo tiene por defecto)", () => {
    for (const activeRole of ["superadmin", "jefe_comercial", "comercial"] as const) {
      const items = getVisibleSidebarItems({
        activeModule: "erp",
        activeRole,
        superadminViewMode: "tramitacion",
        staffPermissions: defaultPermissionsForRole(activeRole),
      })
      expect(items.some((item) => item.name === "SIPS")).toBe(true)
    }

    const tramitacionDefault = getVisibleSidebarItems({
      activeModule: "erp",
      activeRole: "tramitacion",
      superadminViewMode: "tramitacion",
      staffPermissions: defaultPermissionsForRole("tramitacion"),
    })
    expect(tramitacionDefault.some((item) => item.name === "SIPS")).toBe(false)

    const tramitacionGranted = getVisibleSidebarItems({
      activeModule: "erp",
      activeRole: "tramitacion",
      superadminViewMode: "tramitacion",
      staffPermissions: { ...defaultPermissionsForRole("tramitacion"), comparatorAccess: true },
    })
    expect(tramitacionGranted.some((item) => item.name === "SIPS")).toBe(true)

    const withoutPermission = getVisibleSidebarItems({
      activeModule: "erp",
      activeRole: "comercial",
      superadminViewMode: "tramitacion",
      staffPermissions: { ...defaultPermissionsForRole("comercial"), comparatorAccess: false },
    })
    expect(withoutPermission.some((item) => item.name === "SIPS")).toBe(false)
  })

  it("muestra Webhooks Enertech solo al superadmin dueño y a tramitación", () => {
    const owner = getVisibleSidebarItems({
      activeModule: "erp",
      activeRole: "superadmin",
      superadminViewMode: "tramitacion",
      staffEmail: AT_OUTBOUND_OWNER_EMAIL,
    })
    const otherSuperadmin = getVisibleSidebarItems({
      activeModule: "erp",
      activeRole: "superadmin",
      superadminViewMode: "tramitacion",
      staffEmail: "other@example.com",
    })
    const tramitacion = getVisibleSidebarItems({
      activeModule: "erp",
      activeRole: "tramitacion",
      superadminViewMode: "tramitacion",
      staffEmail: "ops@example.com",
    })

    expect(owner.some((item) => item.name === "Webhooks Enertech")).toBe(true)
    expect(otherSuperadmin.some((item) => item.name === "Webhooks Enertech")).toBe(false)
    expect(tramitacion.some((item) => item.name === "Webhooks Enertech")).toBe(true)
  })
})
