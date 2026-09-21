import { describe, expect, it } from "vitest"
import { defaultPermissionsForRole } from "@/types/profile"
import {
  canAccessComparator,
  canAlegarLiquidaciones,
  canConsolidateLiquidaciones,
  canExportDatabase,
  canViewContracts,
  canViewRetrocommissions,
  hasStaffPermission,
  sanitizeStaffPermissionsForRole,
} from "./staff-permissions"

describe("staff-permissions", () => {
  it("superadmin ignora los flags de permisos", () => {
    const denied = {
      contractsView: false,
      comparatorAccess: false,
      quickSettlement: false,
      exportDatabase: false,
      viewRetrocommissions: false,
    }

    expect(hasStaffPermission("superadmin", denied, "contractsView")).toBe(true)
    expect(canExportDatabase("superadmin", denied)).toBe(true)
  })

  it("comercial siempre puede ver contratos aunque contractsView esté desactivado en BD", () => {
    const permissions = {
      ...defaultPermissionsForRole("comercial"),
      contractsView: false,
      comparatorAccess: false,
    }

    expect(canViewContracts("comercial", permissions)).toBe(true)
    expect(canViewContracts("jefe_comercial", permissions)).toBe(true)
    expect(canAccessComparator("comercial", permissions)).toBe(false)
  })

  it("respeta contractsView para tramitación", () => {
    const permissions = {
      ...defaultPermissionsForRole("tramitacion"),
      contractsView: false,
    }

    expect(canViewContracts("tramitacion", permissions)).toBe(false)
  })

  it("tramitación puede consolidar con quickSettlement activo", () => {
    const permissions = {
      ...defaultPermissionsForRole("tramitacion"),
      quickSettlement: true,
    }

    expect(canConsolidateLiquidaciones("tramitacion", permissions)).toBe(true)
  })

  it("comercial no puede consolidar aunque tenga quickSettlement en BD", () => {
    const permissions = {
      ...defaultPermissionsForRole("comercial"),
      quickSettlement: true,
    }

    expect(canConsolidateLiquidaciones("comercial", permissions)).toBe(false)
    expect(canAlegarLiquidaciones("comercial")).toBe(true)
  })

  it("fuerza quickSettlement false y contractsView true al guardar permisos de comercial", () => {
    const sanitized = sanitizeStaffPermissionsForRole("comercial", {
      ...defaultPermissionsForRole("comercial"),
      quickSettlement: true,
      contractsView: false,
    })

    expect(sanitized.quickSettlement).toBe(false)
    expect(sanitized.contractsView).toBe(true)
  })

  it("oculta retrocomisiones cuando viewRetrocommissions es false", () => {
    const permissions = {
      ...defaultPermissionsForRole("jefe_comercial"),
      viewRetrocommissions: false,
    }

    expect(canViewRetrocommissions("jefe_comercial", permissions)).toBe(false)
  })
})
