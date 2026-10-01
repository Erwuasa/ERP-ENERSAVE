import { describe, expect, it } from "vitest"
import {
  buildCompaniaLogoPublicStorageUrl,
  encodeStorageObjectPath,
} from "./compania-logo-storage"

describe("compania-logo-storage", () => {
  it("codifica paths con espacios para URL pública", () => {
    expect(encodeStorageObjectPath("Material/logo nexus energia.webp")).toBe(
      "Material/logo%20nexus%20energia.webp"
    )
  })

  it("construye URL pública para Nexus", () => {
    const url = buildCompaniaLogoPublicStorageUrl("nexus")
    expect(url).toContain("/storage/v1/object/public/Website/")
    expect(url).toContain("logo%20nexus%20energia.webp")
  })
})
