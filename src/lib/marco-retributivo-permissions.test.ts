import { describe, expect, it } from "vitest"
import {
  canEditMarcoRetributivo,
  canEditTariffSettings,
  canManageTariffSettings,
  canViewMarcoRetributivo,
} from "./marco-retributivo-permissions"

describe("canViewMarcoRetributivo", () => {
  it("allows commercial roles and superadmin in any view", () => {
    expect(canViewMarcoRetributivo("comercial")).toBe(true)
    expect(canViewMarcoRetributivo("jefe_comercial")).toBe(true)
    expect(canViewMarcoRetributivo("tramitacion")).toBe(true)
    expect(canViewMarcoRetributivo("superadmin", { superadminViewMode: "comercial" })).toBe(
      true
    )
    expect(canViewMarcoRetributivo("superadmin", { superadminViewMode: "tramitacion" })).toBe(
      true
    )
  })
})

describe("canEditMarcoRetributivo", () => {
  it("allows tramitacion and superadmin in tramitacion view only", () => {
    expect(canEditMarcoRetributivo("tramitacion")).toBe(true)
    expect(
      canEditMarcoRetributivo("superadmin", { superadminViewMode: "tramitacion" })
    ).toBe(true)
  })

  it("blocks superadmin in comercial view or without explicit tramitacion view", () => {
    expect(canEditMarcoRetributivo("superadmin")).toBe(false)
    expect(
      canEditMarcoRetributivo("superadmin", { superadminViewMode: "comercial" })
    ).toBe(false)
  })

  it("blocks comercial and jefe_comercial", () => {
    expect(canEditMarcoRetributivo("comercial")).toBe(false)
    expect(canEditMarcoRetributivo("jefe_comercial")).toBe(false)
  })
})

describe("canManageTariffSettings", () => {
  it("follows tramitacion operativa rules", () => {
    expect(canManageTariffSettings("tramitacion")).toBe(true)
    expect(
      canManageTariffSettings("superadmin", { superadminViewMode: "tramitacion" })
    ).toBe(true)
    expect(
      canManageTariffSettings("superadmin", { superadminViewMode: "comercial" })
    ).toBe(false)
    expect(canManageTariffSettings("comercial")).toBe(false)
  })
})

describe("canEditTariffSettings", () => {
  it("aliases canManageTariffSettings", () => {
    expect(canEditTariffSettings("tramitacion")).toBe(true)
    expect(
      canEditTariffSettings("superadmin", { superadminViewMode: "comercial" })
    ).toBe(false)
  })
})
