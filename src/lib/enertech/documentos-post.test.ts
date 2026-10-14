import { describe, expect, it } from "vitest"
import {
  ENERTECH_DOCUMENTO_MAX_BYTES,
  collectEnertechDocumentos,
  filesToEnertechDocumentos,
  isEnertechDocumentoSizeAllowed,
  toEnertechDocumento,
} from "./documentos-post"

describe("documentos del POST /contratos", () => {
  it("codifica un pdf en filename y base64", () => {
    const bytes = new TextEncoder().encode("%PDF-1.4")
    expect(toEnertechDocumento({ filename: "DNI firmante.pdf", bytes })).toEqual({
      filename: "DNI firmante.pdf",
      base64: btoa("%PDF-1.4"),
    })
  })

  it("deja fuera extensiones que Enertech no admite y archivos vacíos o de más de 15 MB", () => {
    const bytes = new TextEncoder().encode("hola")
    expect(toEnertechDocumento({ filename: "nota.txt", bytes })).toBeNull()
    expect(toEnertechDocumento({ filename: "vacio.pdf", bytes: new Uint8Array() })).toBeNull()
    expect(isEnertechDocumentoSizeAllowed(0)).toBe(false)
    expect(isEnertechDocumentoSizeAllowed(ENERTECH_DOCUMENTO_MAX_BYTES)).toBe(true)
    expect(isEnertechDocumentoSizeAllowed(ENERTECH_DOCUMENTO_MAX_BYTES + 1)).toBe(false)
  })

  it("renombra un archivo repetido y omite el que no sirve", () => {
    const bytes = new TextEncoder().encode("%PDF")
    const documentos = collectEnertechDocumentos([
      { filename: "dni.pdf", bytes },
      { filename: "notas.doc", bytes },
      { filename: "dni.pdf", bytes },
    ])
    expect(documentos.map((doc) => doc.filename)).toEqual(["dni.pdf", "dni-2.pdf"])
    expect(documentos[0]?.base64).toBe(btoa("%PDF"))
  })

  it("lee los File del formulario y descarta el que no cabe", async () => {
    const pdf = new File(["%PDF"], "factura.pdf", { type: "application/pdf" })
    const word = new File(["x"], "otro.doc", { type: "application/msword" })
    const documentos = await filesToEnertechDocumentos([pdf, word])
    expect(documentos).toEqual([{ filename: "factura.pdf", base64: btoa("%PDF") }])
  })
})
