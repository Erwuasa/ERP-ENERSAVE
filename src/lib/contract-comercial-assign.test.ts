import { describe, expect, it } from "vitest"
import { resolveContractComercialDbFields } from "./contract-comercial-assign"

describe("resolveContractComercialDbFields", () => {
  it("asigna jefe_equipo con manager_id del perfil", () => {
    const fields = resolveContractComercialDbFields({
      comercialId: "com-1",
      comercialName: "Pablo Gutierrez",
      sellerProfile: { managerId: "jefe-1", fullName: "Pablo Gutierrez" },
    })
    expect(fields.comercial_id).toBe("com-1")
    expect(fields.jefe_equipo).toBe("jefe-1")
    expect(fields.nombre_comercial).toBe("Pablo Gutierrez")
  })
})
