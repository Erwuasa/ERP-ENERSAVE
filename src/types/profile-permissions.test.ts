import { describe, expect, it } from "vitest"
import { defaultPermissionsForRole, mergePermissionsForRole } from "./profile"

describe("mergePermissionsForRole", () => {
  it("usa los valores por defecto cuando no hay permisos guardados", () => {
    expect(mergePermissionsForRole("comercial")).toEqual(defaultPermissionsForRole("comercial"))
    expect(mergePermissionsForRole("comercial", {})).toEqual(defaultPermissionsForRole("comercial"))
  })

  it("respeta los flags persistidos en Supabase", () => {
    expect(
      mergePermissionsForRole("comercial", {
        contractsView: false,
        comparatorAccess: true,
      })
    ).toMatchObject({
      contractsView: false,
      comparatorAccess: true,
      quickSettlement: false,
    })
  })
})
