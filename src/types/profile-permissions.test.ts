import { describe, expect, it } from "vitest"
import { defaultPermissionsForRole, mergePermissionsForRole } from "./profile"

describe("mergePermissionsForRole", () => {
  it("usa los valores por defecto cuando no hay permisos guardados", () => {
    expect(mergePermissionsForRole("comercial")).toEqual(defaultPermissionsForRole("comercial"))
    expect(mergePermissionsForRole("comercial", {})).toEqual(defaultPermissionsForRole("comercial"))
  })

  it("respeta flags persistidos salvo restricciones de rol comercial", () => {
    expect(
      mergePermissionsForRole("comercial", {
        contractsView: false,
        comparatorAccess: true,
        quickSettlement: true,
      })
    ).toMatchObject({
      contractsView: true,
      comparatorAccess: true,
      quickSettlement: false,
    })
  })
})
