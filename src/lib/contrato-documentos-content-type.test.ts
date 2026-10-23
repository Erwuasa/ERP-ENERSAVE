import { describe, expect, it } from "vitest"
import { contentTypeForContratoFile } from "./contrato-documentos"

describe("contentTypeForContratoFile", () => {
  it("normaliza jpg y deduce el tipo por la extensión", () => {
    expect(contentTypeForContratoFile({ name: "dni.jpg", type: "image/jpg" })).toBe("image/jpeg")
    expect(contentTypeForContratoFile({ name: "dni.pdf", type: "" })).toBe("application/pdf")
    expect(contentTypeForContratoFile({ name: "foto.HEIC", type: "application/octet-stream" })).toBe(
      "image/heic"
    )
  })
})
